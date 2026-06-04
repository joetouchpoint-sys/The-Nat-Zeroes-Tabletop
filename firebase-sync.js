/* Firebase real-time sync for Nat Zeroes VTT */
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

    // ---- Session (room-code) state ----
    var currentCode = null;
    var stateRef = null, stateListener = null;
    var presenceRef = null, presenceListener = null;
    var isIncoming = false;
    var writeTimer = null;

    // ---- Permanent campaign state (always synced, no room code needed) ----
    var campaignRef = db.ref("campaign/global");
    var campaignListener = null;
    var campaignWriteTimer = null;
    var isCampaignIncoming = false;

    window.NZFirebase = {

      // ── Permanent campaign sync ─────────────────────────────────────────

      // DM calls this whenever campaign data changes; all devices receive it
      writeCampaign: function(data) {
        if (isCampaignIncoming) return;
        clearTimeout(campaignWriteTimer);
        campaignWriteTimer = setTimeout(function() {
          // Strip large images from recaps to keep payload small
          var safe = JSON.parse(JSON.stringify(data));
          campaignRef.set(safe).catch(function() {});
        }, 400);
      },

      // All devices call this on load to receive DM's latest campaign data
      watchCampaign: function(onUpdate) {
        if (campaignListener) campaignRef.off("value", campaignListener);
        campaignListener = campaignRef.on("value", function(snap) {
          var data = snap.val();
          if (!data) return;
          isCampaignIncoming = true;
          try { onUpdate(data); } catch(e) {}
          setTimeout(function() { isCampaignIncoming = false; }, 300);
        });
      },

      stopWatchingCampaign: function() {
        if (campaignListener) { campaignRef.off("value", campaignListener); campaignListener = null; }
      },

      // ── Session (room-code) sync ────────────────────────────────────────

      joinRoom: function(code, onUpdate) {
        this.leaveRoom();
        currentCode = code;
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
          if (currentCode) db.ref("rooms/" + currentCode + "/state").set(data).catch(function() {});
        }, 180);
      },

      setPresence: function(key, data) {
        if (!currentCode) return;
        window.NZFirebase._presenceKey = key;
        var ref = db.ref("rooms/" + currentCode + "/presence/" + key);
        ref.set(data);
        ref.onDisconnect().remove();
      },

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
      writeCampaign: function(){}, watchCampaign: function(){}, stopWatchingCampaign: function(){},
      _presenceKey: null, isReady: false
    };
  }
})();
