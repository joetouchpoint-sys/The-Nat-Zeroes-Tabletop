/* NZSounds — programmatic Web Audio sound effects, no external files needed */
(function() {
  var ctx = null;
  function getCtx() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    return ctx;
  }

  function env(node, ac, attack, hold, decay, peak, end) {
    var t = ac.currentTime;
    node.gain.setValueAtTime(0, t);
    node.gain.linearRampToValueAtTime(peak, t + attack);
    node.gain.setValueAtTime(peak, t + attack + hold);
    node.gain.exponentialRampToValueAtTime(Math.max(0.001, end), t + attack + hold + decay);
  }

  function playDice() {
    var ac = getCtx(); if (!ac) return;
    for (var i = 0; i < 4; i++) {
      (function(delay) {
        setTimeout(function() {
          var buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
          var data = buf.getChannelData(0);
          for (var j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 2);
          var src = ac.createBufferSource();
          src.buffer = buf;
          var gain = ac.createGain();
          var filt = ac.createBiquadFilter();
          filt.type = "bandpass"; filt.frequency.value = 1200 + Math.random() * 800; filt.Q.value = 0.8;
          src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
          gain.gain.setValueAtTime(0.18, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
          src.start();
        }, delay);
      })(i * 55 + Math.random() * 30);
    }
  }

  function playCrit() {
    var ac = getCtx(); if (!ac) return;
    [0, 100, 180].forEach(function(delay, i) {
      setTimeout(function() {
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440 + i * 220, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880 + i * 280, ac.currentTime + 0.12);
        env(gain, ac, 0.005, 0.04, 0.2, 0.22, 0.01);
        osc.start(); osc.stop(ac.currentTime + 0.4);
      }, delay);
    });
  }

  function playNat1() {
    var ac = getCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.6);
    env(gain, ac, 0.01, 0.0, 0.55, 0.15, 0.001);
    osc.start(); osc.stop(ac.currentTime + 0.7);
  }

  function playDamage() {
    var ac = getCtx(); if (!ac) return;
    var buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 1.5) * 0.9;
    var src = ac.createBufferSource();
    src.buffer = buf;
    var filt = ac.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = 300;
    var gain = ac.createGain();
    src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.35, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    src.start();
  }

  function playDeath() {
    var ac = getCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 1.4);
    env(gain, ac, 0.02, 0.1, 1.2, 0.18, 0.001);
    osc.start(); osc.stop(ac.currentTime + 1.6);
  }

  function playTurn() {
    var ac = getCtx(); if (!ac) return;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.value = 660;
    env(gain, ac, 0.004, 0.0, 0.12, 0.12, 0.001);
    osc.start(); osc.stop(ac.currentTime + 0.16);
  }

  var SOUNDS = { dice: playDice, crit: playCrit, nat1: playNat1, damage: playDamage, death: playDeath, turn: playTurn };

  window.NZSounds = {
    play: function(name) {
      try { if (SOUNDS[name]) SOUNDS[name](); } catch(e) {}
    }
  };
})();
