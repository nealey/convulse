// jshint asi:true

function toast(text, timeout=8000) {
  let toasts = document.querySelector("#toasts")
  if (! text) {
    while (toasts.firstChild) {
      toasts.firstChild.remove()
    }
  } else {
    let p = document.querySelector("#toasts").appendChild(document.createElement("p"))
    p.textContent = text
    if (timeout) {
      setTimeout(() => p.remove(), timeout)
    }
  }
}

class Convulse {
  constructor() {
    this.canvas = document.querySelector("canvas")
    this.ctx = this.canvas.getContext("2d")
    this.dllink = document.querySelector("#download")
    this.webcamVideo = document.querySelector("#webcam")
    this.desktopVideo = document.querySelector("#desktop")
    document.addEventListener("click", event => this.toggle())
    this.chunks = []
    
    document.addEventListener("mouseenter", e => this.showControls(true))
    document.addEventListener("mouseleave", e => this.showControls(false))
    this.init()
  }
  
  showControls(show) {
    let controls = document.querySelector("#controls")
    if (show) {
      controls.classList.remove("hidden")
    } else {
      controls.classList.add("hidden")
    }
  }
  
  download(event) {
    let recording = window.URL.createObjectURL(new Blob(this.chunks, {type: this.recorder.mimeType}))
    let now = new Date().toISOString()
    
    this.dllink.addEventListener('progress', event => console.log(event))
    this.dllink.href = recording
    this.dllink.download = "convulse-" + now + ".webm"
    this.dllink.click()
  }
  
  start() {
    toast(null)
    this.chunks = []
    this.recorder.start(10)
    this.canvas.classList.add("recording")
  }
  
  stop() {
    toast("stopped and downloaded")
    this.recorder.stop()
    this.canvas.classList.remove("recording")
  }
  
  toggle() {
    if (this.recorder.state == "recording") {
      this.stop()
      this.download()
    } else {
      this.start()
    }
  }
  
  frame(timestamp) {
    if (this.webcamVideo.videoWidth > 0) {
      let webcamAR = this.webcamVideo.videoWidth / this.webcamVideo.videoHeight
      let desktopAR = this.desktopVideo.videoWidth / this.desktopVideo.videoHeight
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      this.ctx.drawImage(this.desktopVideo, 0, 0, this.canvas.height * desktopAR, this.canvas.height)
      this.ctx.drawImage(this.webcamVideo, 0, 0, webcamAR * 400, 400)
      if (timestamp % 2000 < 1000) {
        this.ctx.beginPath()
        this.ctx.strokeStyle = "red"
        this.ctx.lineWidth = "6"
        this.ctx.rect(20, 20, 150, 100)
        this.ctx.stroke()
      }
    }

    requestAnimationFrame(ts => this.frame(ts))
  }
  
  async init() {
    this.canvas.width = 1920
    this.canvas.height = 1080
    
    this.webcamVideo.srcObject = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
    this.webcamVideo.play()

    this.desktopVideo.srcObject = await navigator.mediaDevices.getDisplayMedia({video: {cursor: "always"}})
    this.desktopVideo.play()
    
    document.querySelector("#hello").classList.add("hidden")
  
    this.mediaStream = new MediaStream()
    let canvasStream = this.canvas.captureStream(30)
    for (let vt of canvasStream.getVideoTracks()) {
      this.mediaStream.addTrack(vt)
      console.log("Adding video track", vt)
    }
    for (let at of this.webcamVideo.srcObject.getAudioTracks()) {
      this.mediaStream.addTrack(at)
      console.log("Adding audio track", at)
    }
    
    this.recorder = new MediaRecorder(this.canvas.captureStream(30), {mimeType: "video/webm"})
    this.recorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data)
      }
    })

    this.frame()

    toast("Click anywhere to start and stop recording")
  }
}

function init() {
  window.app = new Convulse()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
