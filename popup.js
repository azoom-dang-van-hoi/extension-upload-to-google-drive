const inputElement = document.getElementById("inputElement")
const folderElement = document.getElementById("folderId")
const changeAccountElement = document.getElementById("changeAccount")
const connectDriveBtn = document.getElementById("connectDriveBtn")
const startBtn = document.getElementById("startBtn")
// const stopBtn = document.getElementById("stopBtn")

let screenshotUrls = []
let folderId = localStorage.getItem("driverFolderId")

document.addEventListener("DOMContentLoaded", init)

inputElement.addEventListener("paste", async (event) => {
  const clipboardData = event.clipboardData
  const items = clipboardData.items

  for (const item of items) {
    if (item.type.indexOf("image") === 0) {
      const blob = item.getAsFile()
      uploadToDrive(await blobToBase64(blob))
      break
    }
  }
})

folderElement.addEventListener("input", (e) => {
  folderId = e.target.value
  localStorage.setItem("driverFolderId", folderId)
})

changeAccountElement.addEventListener("click", () => {
  chrome.identity.getAuthToken(
    {
      interactive: true,
    },
    function (result) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError)
        return
      }
      chrome.identity.clearAllCachedAuthTokens(() => {
        console.log("clear cache done")
        folderId = ""
        screenshotUrls = []
        localStorage.removeItem("screenshotUrls")
        localStorage.removeItem("driverFolderId")
        renderUrls(screenshotUrls)

        const contentElement = document.getElementById("app")
        contentElement.style.display = "none"
        const connectDriveBtn = document.getElementById("connectDriveBtn")
        connectDriveBtn.style.display = "inline-block"
      })
    }
  )
})

connectDriveBtn.addEventListener("click", () => {
  chrome.identity.getAuthToken(
    {
      interactive: true,
    },
    function () {
      const connectDriveBtn = document.getElementById("connectDriveBtn")
      connectDriveBtn.style.display = "none"
      const contentElement = document.getElementById("app")
      contentElement.style.display = "block"
    }
  )
})

startBtn.addEventListener("click", () => {
  chrome.identity.getAuthToken(
    {
      interactive: true,
    },
    function (token) {
      chrome.runtime.sendMessage({ type: "startRecording", folderId, token })
    }
  )
  startBtn.disabled = true
  stopBtn.disabled = false
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
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const loadingElement = document.getElementById(request.loadingElementId)
    if (request.type === "uploaded") {
      loadingElement.remove()
      addNewUrl({
        url: request.content.webViewLink,
        id: request.content.id,
        type: request.urlType,
      })
      renderUrls(screenshotUrls)
    } else if (request.type === "uploading") {
      loadingElement.style.setProperty(`--progress`, `${request.progress}%`)
    }
  })
  screenshotUrls.push(...loadUrls())
  renderUrls(screenshotUrls)
  folderElement.value = folderId
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function uploadToDrive(imageData) {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
      return
    }
    const fileContainer = document.getElementById("files")
    const loadingElement = document.createElement("div")
    loadingElement.id = `loading-container-${new Date().getTime()}`
    loadingElement.classList.add("progressContainer")
    fileContainer.appendChild(loadingElement)

    // Tạo file metadata
    const fileMetadata = {
      name: `screenshot-${new Date().getTime()}.png`,
      mimeType: "image/png",
      parents: [folderId],
    }

    chrome.runtime.sendMessage({
      type: "upload",
      form: {
        fileMetadata,
        imageData,
      },
      token,
      loadingElementId: loadingElement.id,
    })
  })
}

function getUrlById(id) {
  return screenshotUrls.find((url) => url.id === id)
}

function addNewUrl(url) {
  if (screenshotUrls.find((item) => item.id === url.id)) return
  screenshotUrls.push(url)
}

function deleteUrl(id) {
  screenshotUrls = screenshotUrls.filter((url) => url.id !== id)
  localStorage.setItem("screenshotUrls", JSON.stringify(screenshotUrls))
}

function loadUrls() {
  return JSON.parse(localStorage.getItem("screenshotUrls") ?? "[]")
}

function renderUrls(urls = []) {
  const filesElement = document.getElementById("files")
  filesElement.innerHTML = ""
  urls
    .filter((url) => url.id)
    .forEach((url, index) => {
      addFileItem(url, index)
    })
}

function addFileItem({ url, id, type }, index) {
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
  contentEl.textContent =
    type === "video"
      ? `Recording screen ${index + 1}: ${id}`
      : `Screenshot ${index + 1}: ${id}`
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
