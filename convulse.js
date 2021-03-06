// jshint asi:true

Math.TAU = Math.PI * 2

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
    this.chunks = []
    this.canvas = document.querySelector("canvas")
    this.ctx = this.canvas.getContext("2d")
    this.dllink = document.querySelector("#download")
    this.webcamVideo = document.querySelector("#webcam")
    this.desktopVideo = document.querySelector("#desktop")

    this.canvas.width = 1920
    this.canvas.height = 1080
    document.querySelector("#indicator").classList.add("hidden")

    document.addEventListener("mouseenter", e => this.showControls(true))
    document.addEventListener("mouseleave", e => this.showControls(false))
    
    document.querySelector("canvas").addEventListener("click", e => this.rec(e))
    document.querySelector("#rec").addEventListener("click", e => this.rec(e))
    //document.querySelector("#save").addEventListener("click", e => this.save(e))
    
    document.querySelector("#webcam-size").addEventListener("input", e => this.setWebcamSize(e))
    document.querySelector("#webcam-size").value = localStorage.webcamSize || 0.3
    document.querySelector("#webcam-size").dispatchEvent(new Event("input"))
    document.querySelector("#webcam-pos").addEventListener("click", e => this.setWebcamPos(e))
    this.webcamPos = localStorage.webcamPos || 2
    
    document.querySelector("#desktop-size").addEventListener("input", e => this.setDesktopSize(e))
    document.querySelector("#desktop-size").value = localStorage.desktopSize || 2.0
    document.querySelector("#desktop-size").dispatchEvent(new Event("input"))
    document.querySelector("#desktop-pos").addEventListener("click", e => this.setDesktopPos(e))
    this.desktopPos = localStorage.desktopPos || 0
    
    this.recorder = {state: "unstarted"}
    
    this.mediaStream = new MediaStream()
    
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then(media => {
      document.querySelector("#hello").classList.add("hidden")
      this.webcamVideo.muted = true
      this.webcamVideo.srcObject = media
      this.webcamVideo.play()
      for (let at of media.getAudioTracks()) {
        this.mediaStream.addTrack(at)
        console.log("Adding audio track", at)
      }
    })
    .catch(err => {
      toast("Couldn't open camera!")
    })

    navigator.mediaDevices.getDisplayMedia({video: {cursor: "always"}})
    .then(media => {
      document.querySelector("#hello").classList.add("hidden")
      this.desktopVideo.srcObject = media
      this.desktopVideo.play()
    })
    .catch(err => {
      toast("Couldn't open screen grabber!")
    })
  
    let canvasStream = this.canvas.captureStream(30)
    for (let vt of canvasStream.getVideoTracks()) {
      this.mediaStream.addTrack(vt)
      console.log("Adding video track", vt)
    }
    
    this.frame()

    toast("Click anywhere to start and stop recording")
  }
  
  setWebcamSize(event) {
    this.webcamSize = event.target.value
    localStorage.webcamSize = this.webcamSize
  }
  
  setWebcamPos(event) {
    this.webcamPos = (this.webcamPos + 1) % 9
    localStorage.webcamPos = this.webcamPos
  }
  
  setDesktopSize(event) {
    this.desktopSize = event.target.value
    localStorage.desktopSize = this.desktopSize
  }
  
  setDesktopPos(event) {
    this.desktopPos = (this.desktopPos + 1) % 9
    localStorage.desktopPos = this.desktopPos
  }
  
  rec(event) {
    let button = document.querySelector("#rec")
    if (this.recorder.state == "recording") {
      // Stop
      this.recorder.stop()
      this.canvas.classList.remove("recording")
      document.querySelector("#indicator").classList.add("hidden")
      button.textContent = "⏺️"
      toast("Stopped")
      document.title = "Convulse: stopped"
      this.save()
    } else {
      // Start
      this.chunks = []
      this.recorder = new MediaRecorder(this.mediaStream, {mimeType: "video/webm"})
      this.recorder.addEventListener("dataavailable", event => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data)
        }
      })
      
      this.recorder.start(10)
      this.canvas.classList.add("recording")
      document.querySelector("#indicator").classList.remove("hidden")
      button.textContent = "⏹️"
      toast("Recording: click anywhere to stop")
      document.title = "Convulse: recording"
    }
  }
  
  showControls(show) {
    let controls = document.querySelector("#controls")
    if (show) {
      controls.classList.remove("hidden")
    } else {
      controls.classList.add("hidden")
    }
  }
  
  save(event) {
    let recording = window.URL.createObjectURL(new Blob(this.chunks, {type: this.recorder.mimeType}))
    let now = new Date().toISOString()
    let saveButton = document.querySelector("#save")
    
    saveButton.addEventListener('progress', event => console.log(event))
    saveButton.href = recording
    saveButton.download = "convulse-" + now + ".webm"
    saveButton.click()
  }

  frame(timestamp) {
    if (this.desktopVideo.videoWidth > 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      
      let desktopAR = this.desktopVideo.videoWidth / this.desktopVideo.videoHeight
      let desktopHeight = this.canvas.height * this.desktopSize
      let desktopWidth = desktopHeight * desktopAR
      let desktopY = (this.canvas.height - desktopHeight) * (Math.floor(this.desktopPos / 3) / 2)
      let desktopX = (this.canvas.width - desktopWidth) * (Math.floor(this.desktopPos % 3) / 2)
      this.ctx.drawImage(
        this.desktopVideo,
        desktopX, desktopY,
        desktopWidth, desktopHeight
      )
    }
    
    if (this.webcamVideo.videoWidth > 0) {
      let webcamAR = this.webcamVideo.videoWidth / this.webcamVideo.videoHeight
      let webcamHeight = this.canvas.height * this.webcamSize
      let webcamWidth = webcamHeight * webcamAR
      let webcamY = (this.canvas.height - webcamHeight) * (Math.floor(this.webcamPos / 3) / 2)
      let webcamX = (this.canvas.width - webcamWidth) * (Math.floor(this.webcamPos % 3) / 2)
      this.ctx.drawImage(
        this.webcamVideo,
        webcamX, webcamY,
        webcamWidth, webcamHeight
      )
      console.log(webcamAR)
    }

    requestAnimationFrame(ts => this.frame(ts))
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
