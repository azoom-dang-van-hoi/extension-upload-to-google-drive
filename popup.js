const inputElement = document.getElementById("inputElement")
const folderElement = document.getElementById("folderId")
let screenshotUrls = []
let folderId =
  localStorage.getItem("driverFolderId") || "1R9mHauxI3rCOZln1tJfWz-ZHlgogIqJF"

document.addEventListener("DOMContentLoaded", init)

inputElement.addEventListener("paste", (event) => {
  const clipboardData = event.clipboardData
  const items = clipboardData.items

  for (const item of items) {
    if (item.type.indexOf("image") === 0) {
      const blob = item.getAsFile()
      uploadToDrive(blob)
      break
    }
  }
})

folderElement.addEventListener("input", (e) => {
  folderId = e.target.value
  localStorage.setItem("driverFolderId", folderId)
})

function init() {
  chrome.identity.getAuthToken(
    {
      interactive: true,
    },
    function (result) {
      if (result) {
        // Hidden button connectDriveBtn
        const connectDriveBtn = document.getElementById("connectDriveBtn")
        connectDriveBtn.style.display = "none"
      } else {
        const contentElement = document.getElementById("app")
        contentElement.style.display = "none"
      }
    }
  )
  screenshotUrls.push(...loadUrls())
  renderUrls(screenshotUrls)
  folderElement.value = folderId
}

function uploadToDrive(imageData) {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
      return
    }
    const fileContainer = document.getElementById("files")
    const loadingElement = document.createElement("div")
    loadingElement.classList.add("progressContainer")
    fileContainer.appendChild(loadingElement)

    // Tạo file metadata
    var fileMetadata = {
      name: `screenshot-${new Date().getTime()}.png`,
      mimeType: "image/png",
      parents: folderId.split(";"),
    }

    const url = {}

    // Upload file lên Google Drive
    var form = new FormData()
    form.append(
      "metadata",
      new Blob([JSON.stringify(fileMetadata)], { type: "application/json" })
    )
    form.append("file", imageData)

    var xhr = new XMLHttpRequest()
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    )
    xhr.setRequestHeader("Authorization", "Bearer " + token)
    xhr.responseType = "json"
    xhr.onload = async function () {
      url.id = xhr.response.id
      const result = await fetch(
        `https://www.googleapis.com/drive/v3/files/${url.id}?fields=id,name,mimeType,thumbnailLink,webViewLink`,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      ).then((data) => data.json())
      url.url = result.webViewLink
      loadingElement.remove()
      addNewUrl(url)
      renderUrls(screenshotUrls)
    }
    xhr.upload.onprogress = function (e) {
      const progress = (e.loaded / e.total) * 100
      loadingElement.style.setProperty(`--progress`, `${progress}%`)
    }
    xhr.send(form)
  })
}

function getUrlById(id) {
  return screenshotUrls.find((url) => url.id === id)
}

function addNewUrl({ url, id }) {
  screenshotUrls.push({ url, id })
  localStorage.setItem("screenshotUrls", JSON.stringify(screenshotUrls))
}

function deleteUrl(id) {
  screenshotUrls = screenshotUrls.filter((url) => url.id !== id)
  localStorage.setItem("screenshotUrls", JSON.stringify(screenshotUrls))
}

function loadUrls() {
  return JSON.parse(localStorage.getItem("screenshotUrls") ?? "[]")
}

function renderUrls(urls = []) {
  urls.forEach((url) => {
    addFileItem(url)
  })
}

function addFileItem({ url, id }) {
  const filesElement = document.getElementById("files")
  const itemEl = document.createElement("p")
  itemEl.classList.add("item")
  itemEl.id = id
  filesElement.appendChild(itemEl)

  const copyEl = document.createElement("button")
  copyEl.classList.add("copy")
  copyEl.id = `copy-${id}`
  copyEl.textContent = `Copy`
  itemEl.appendChild(copyEl)
  copyEl.addEventListener("click", handleCopyLink)

  const contentEl = document.createElement("span")
  contentEl.classList.add("content")
  contentEl.textContent = id
  itemEl.appendChild(contentEl)

  const deleteEl = document.createElement("button")
  deleteEl.classList.add("delete")
  deleteEl.id = `delete-${id}`
  deleteEl.textContent = `x`
  itemEl.appendChild(deleteEl)
  deleteEl.addEventListener("click", handleDeleteLink)
}

function handleCopyLink(e) {
  const urlId = (e.target.id ?? "").split("copy-")[1]
  const url = getUrlById(urlId)
  if (!url) return
  navigator.clipboard.writeText(url.url)
}

function handleDeleteLink(e) {
  const urlId = (e.target.id ?? "").split("delete-")[1]
  const itemEl = document.getElementById(urlId)
  const copyEl = document.getElementById(`copy-${urlId}`)
  copyEl.removeEventListener("click", handleCopyLink)
  const deleteEl = document.getElementById(`delete-${urlId}`)
  deleteUrl(urlId)
  itemEl.remove()
  deleteEl.removeEventListener("click", handleDeleteLink)
}
