chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "upload") {
    const { fileMetadata, imageData } = request.form
    var form = new FormData()
    form.append(
      "metadata",
      new Blob([JSON.stringify(fileMetadata)], { type: "application/json" })
    )
    form.append("file", base64ToBlob(imageData))
    const token = request.token
    const xhr = new XMLHttpRequest()
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink"
    )
    xhr.setRequestHeader("Authorization", "Bearer " + token)
    xhr.responseType = "json"
    xhr.onload = async function () {
      addNewUrl({
        url: xhr.response.webViewLink,
        id: xhr.response.id,
        type: "image",
      })
      chrome.runtime.sendMessage({
        type: "uploaded",
        content: xhr.response,
        loadingElementId: request.loadingElementId,
      })
    }
    xhr.upload.onprogress = function (e) {
      const progress = (e.loaded / e.total) * 100
      chrome.runtime.sendMessage({
        type: "uploading",
        loadingElementId: request.loadingElementId,
        progress,
      })
    }
    xhr.send(form)
  } else if (request.type === "startRecording") {
    startRecording({
      folderId: request.folderId,
      token: request.token,
      loadingElementId: request.loadingElementId,
    })
  } else if (request.type === "stopRecording") {
    stopRecording()
  }
})

function base64ToBlob(base64String) {
  // Chuyển đổi Base64 sang Blob
  const contentType = base64String.match(/^data:(.*);base64,/)[1]
  const base64Data = base64String.replace(/^data:image\/.*;base64,/, "")
  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
  return new Blob([buffer], { type: contentType })
}

function addNewUrl({ url, id, type }) {
  const screenshotUrls = JSON.parse(
    localStorage.getItem("screenshotUrls") || "[]"
  )
  if (screenshotUrls.find((item) => item.id === id)) return
  screenshotUrls.push({ url, id, type })
  localStorage.setItem("screenshotUrls", JSON.stringify(screenshotUrls))
}

let mediaRecorder = null
let chunks = []

async function getTabStream() {
  const tab = await new Promise((resolve) =>
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs)
      resolve(tabs[0])
    })
  )
  return new Promise((resolve) =>
    chrome.tabCapture.capture({ audio: true, video: true }, (stream) =>
      resolve(stream)
    )
  )
}

async function getDesktopStream() {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window"],
      (streamId) => {
        if (!streamId) {
          reject(new Error("Permission denied"))
          return
        }
        navigator.mediaDevices
          .getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: streamId,
              },
            },
          })
          .then(resolve, reject)
      }
    )
  })
}

async function startRecording({ folderId, token, loadingElementId }) {
  const stream = await getDesktopStream()
  mediaRecorder = new MediaRecorder(stream, {
    videoBitsPerSecond: 2500000,
    mimeType: "video/webm; codecs=vp8",
  })
  chunks = []

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm; codecs=vp8" })
    const fileMetadata = {
      name: `screenrecording-${new Date().getTime()}.webm`,
      mimeType: "video/webm; codecs=vp8",
      parents: [folderId],
    }
    const form = new FormData()
    form.append(
      "metadata",
      new Blob([JSON.stringify(fileMetadata)], { type: "application/json" })
    )
    form.append("file", blob)
    const xhr = new XMLHttpRequest()
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink"
    )
    xhr.setRequestHeader("Authorization", "Bearer " + token)
    xhr.responseType = "json"
    xhr.onload = async function () {
      addNewUrl({
        url: xhr.response.webViewLink,
        id: xhr.response.id,
        type: "video",
      })
      chrome.runtime.sendMessage({
        type: "uploaded",
        content: xhr.response,
        loadingElementId: loadingElementId,
        urlType: "video",
      })
    }
    // xhr.upload.onprogress = function (e) {
    //   const progress = (e.loaded / e.total) * 100
    //   chrome.runtime.sendMessage({
    //     type: "uploading",
    //     loadingElementId,
    //     progress,
    //   })
    // }
    xhr.send(form)
  }

  mediaRecorder.start()
}

function stopRecording() {
  mediaRecorder.stop()
}
