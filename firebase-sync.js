/* Firebase real-time sync for Nat Zeroes VTT
   Exposes window.NZFirebase — used by battlemap.jsx for live session sharing */
(function() {
  var firebaseConfig = {
    apiKey: "AIzaSyAc4OJVMZ3ZvM_HmLfvMw9JWEeu9UDHOA8",
    authDomain: "nat-zeroes.firebaseapp.com",
    databaseURL: "https://nat-zeroes-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "nat-zeroes",
    storageBucket: "nat-zeroes.firebasestorage.app",
    messagingSenderId: "92379774362",
    appId: "1:92379774362:web:011719f653613e66090e23"
  };

  try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();

    var currentCode = null;
    var stateRef = null;
    var stateListener = null;
    var presenceRef = null;
    var presenceListener = null;
    var isIncoming = false;
    var writeTimer = null;

    window.NZFirebase = {
      joinRoom: function(code, onUpdate) {
        // Leave existing room first
        this.leaveRoom();
        currentCode = code;

        // Subscribe to game state (tokens, fog, initiative)
        stateRef = db.ref("rooms/" + code + "/state");
        stateListener = stateRef.on("value", function(snap) {
          var data = snap.val();
          if (!data) return;
          isIncoming = true;
          try { onUpdate(data); } catch(e) {}
          setTimeout(function() { isIncoming = false; }, 200);
        });
      },

      leaveRoom: function() {
        if (stateRef && stateListener) stateRef.off("value", stateListener);
        if (presenceRef && presenceListener) presenceRef.off("value", presenceListener);
        // Clear own presence
        if (currentCode && window.NZFirebase._presenceKey) {
          db.ref("rooms/" + currentCode + "/presence/" + window.NZFirebase._presenceKey).remove();
        }
        stateRef = null; stateListener = null;
        presenceRef = null; presenceListener = null;
        currentCode = null;
        window.NZFirebase._presenceKey = null;
      },

      push: function(data) {
        if (!currentCode || isIncoming) return;
        clearTimeout(writeTimer);
        writeTimer = setTimeout(function() {
          if (currentCode) {
            db.ref("rooms/" + currentCode + "/state").set(data).catch(function() {});
          }
        }, 180);
      },

      // Set own presence in current room
      setPresence: function(key, data) {
        if (!currentCode) return;
        window.NZFirebase._presenceKey = key;
        var ref = db.ref("rooms/" + currentCode + "/presence/" + key);
        ref.set(data);
        // Auto-remove on disconnect
        ref.onDisconnect().remove();
      },

      // Watch all presence in current room
      watchPresence: function(onUpdate) {
        if (!currentCode) return;
        if (presenceRef && presenceListener) presenceRef.off("value", presenceListener);
        presenceRef = db.ref("rooms/" + currentCode + "/presence");
        presenceListener = presenceRef.on("value", function(snap) {
          try { onUpdate(snap.val() || {}); } catch(e) {}
        });
      },

      _presenceKey: null,
      isReady: true
    };
  } catch(e) {
    console.warn("Firebase init failed:", e.message);
    window.NZFirebase = {
      joinRoom: function(){}, leaveRoom: function(){}, push: function(){},
      setPresence: function(){}, watchPresence: function(){},
      _presenceKey: null, isReady: false
    };
  }
})();
