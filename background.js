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
      addNewUrl({ url: xhr.response.webViewLink, id: xhr.response.id })
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
  }
})

function base64ToBlob(base64String) {
  // Chuyển đổi Base64 sang Blob
  const contentType = base64String.match(/^data:(.*);base64,/)[1]
  const base64Data = base64String.replace(/^data:image\/.*;base64,/, "")
  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
  return new Blob([buffer], { type: contentType })
}

function addNewUrl({ url, id }) {
  const screenshotUrls = JSON.parse(
    localStorage.getItem("screenshotUrls") || "[]"
  )
  if (screenshotUrls.find((item) => item.id === id)) return
  screenshotUrls.push({ url, id })
  localStorage.setItem("screenshotUrls", JSON.stringify(screenshotUrls))
}
