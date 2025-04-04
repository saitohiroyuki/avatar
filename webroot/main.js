let app, model, audioContext, animationId, mouthInterval;

(async function init() {
  app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    backgroundAlpha: 0,
    width: 1200,
    height: 600
  });

  model = await PIXI.live2d.Live2DModel.from("./model/Hiyori/hiyori_pro_t11.model3.json");

  model.scale.set(0.30);
  model.x = 100;
  model.y = 0;

  app.stage.addChild(model);
})();

function playMotion() {
  if (model) {
    l("playMotion");
    model.motion("Tap", 0);
  }
}

function resetMotion() {
  if (!model) return;

  l("resetMotion");
  model.internalModel.motionManager.stopAllMotions();

  const core = model.internalModel.coreModel;
  const paramCount = core.getParameterCount();

  for (let i = 0; i < paramCount; i++) {
    const id = core.getParameterId(i);
    const def = core.getParameterDefaultValue(i);
    core.setParameterValueById(id, def);
  }

  core.update();
}

function changeExpression() {
  if (model) {
    l("changeExpression");
    model.expression("smile");
  }
}

function momotaro() {
  const audio = new Audio("./voice/momo.wav");
  audio.crossOrigin = "anonymous";

  audio.addEventListener("canplay", async () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();

    stopModelIdleMotion();
    setupAudioLipSync(audio);
    audio.play();
  });

  audio.addEventListener("ended", () => {
    stopLipSync();
    startModelIdleMotion();
  });
}

function setupAudioLipSync(audioElement) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;

  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function animate() {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const openY = Math.min(volume / 70, 1);

    if (model) {
      model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", openY);
      model.internalModel.coreModel.update();
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

function stopLipSync() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (model) {
    model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
    model.internalModel.coreModel.update();
  }
}

function readText() {
  const text = document.getElementById("read").value;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";

  utterance.onstart = () => {
    startSimpleMouthAnimation();
  };

  utterance.onend = () => {
    stopSimpleMouthAnimation();
  };

  speechSynthesis.speak(utterance);
}

function startSimpleMouthAnimation() {
  let open = false;
  mouthInterval = setInterval(() => {
    if (model) {
      const value = open ? 0.8 : 0.0;
      model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", value);
      model.internalModel.coreModel.update();
      open = !open;
    }
  }, 100); // 100ms周期
}

function stopSimpleMouthAnimation() {
  if (mouthInterval) {
    clearInterval(mouthInterval);
    mouthInterval = null;
  }
  if (model) {
    model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
    model.internalModel.coreModel.update();
  }
}

function stopModelIdleMotion() {
  if (model && model.internalModel) {
    model.internalModel.motionManager.stopAllMotions();
  }
}

function startModelIdleMotion() {
  if (model && model.internalModel && model.internalModel.motionManager.definitions["Idle"]?.length > 0) {
    model.motion("Idle");
  }
}

function l(v) {
  console.log(v);
}
