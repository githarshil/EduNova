/**
 * Lazy-loaded LiveKit client wrapper (imported dynamically only on /live/:code).
 * Keeps livekit-client out of the main app bundle.
 */

export async function connectToLiveKitRoom({
  url,
  token,
  role,
  videoEl,
  audioEl,
  onActiveSpeaker,
  onTrackStateChange,
  onWarning
}) {
  const livekit = await import('livekit-client');
  const { Room, RoomEvent, Track } = livekit;

  const room = new Room({
    adaptiveStream: true,
    dynacast: true
  });

  let teacherVideoPub = null;
  let activeVideoTrack = null;
  let teacherAudioTrack = null;
  let currentVideoEl = videoEl || null;
  let currentAudioEl = audioEl || null;

  const attachVideoTrack = (track) => {
    activeVideoTrack = track;
    if (track && currentVideoEl) {
      track.attach(currentVideoEl);
    }
  };

  const attachAudioTrack = (track) => {
    teacherAudioTrack = track;
    if (track && currentAudioEl) {
      track.attach(currentAudioEl);
    }
  };

  const attachTeacherTrack = (track, publication) => {
    if (track.kind === Track.Kind.Video) {
      teacherVideoPub = publication;
      attachVideoTrack(track);
      onTrackStateChange?.({ hasVideo: !publication.isMuted, teacherMuted: publication.isMuted });
    } else if (track.kind === Track.Kind.Audio) {
      attachAudioTrack(track);
      onTrackStateChange?.({ teacherMuted: publication.isMuted });
    }
  };

  room.on(RoomEvent.TrackSubscribed, (track, publication) => {
    attachTeacherTrack(track, publication);
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach();
    if (track.kind === Track.Kind.Video) {
      onTrackStateChange?.({ hasVideo: false });
    }
  });

  room.on(RoomEvent.TrackMuted, (publication) => {
    if (publication.kind === Track.Kind.Audio) {
      onTrackStateChange?.({ teacherMuted: true });
    } else if (publication.kind === Track.Kind.Video) {
      onTrackStateChange?.({ hasVideo: false });
    }
  });

  room.on(RoomEvent.TrackUnmuted, (publication) => {
    if (publication.kind === Track.Kind.Audio) {
      onTrackStateChange?.({ teacherMuted: false });
    } else if (publication.kind === Track.Kind.Video) {
      onTrackStateChange?.({ hasVideo: true });
    }
  });

  room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    onActiveSpeaker?.(speakers.length > 0);
  });

  await room.connect(url, token);

  let localVideoTrack = null;
  let localAudioTrack = null;

  if (role === 'teacher') {
    try {
      localVideoTrack = await livekit.createLocalVideoTrack({
        resolution: { width: 640, height: 360, frameRate: 15 }
      });
      await room.localParticipant.publishTrack(localVideoTrack);
      attachVideoTrack(localVideoTrack);
      onTrackStateChange?.({ hasVideo: true });
    } catch (err) {
      onWarning?.(`Camera unavailable (${err?.message || 'permission denied'}). Audio translation still works.`);
    }

    try {
      localAudioTrack = await livekit.createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true
      });
      await room.localParticipant.publishTrack(localAudioTrack);
    } catch (err) {
      onWarning?.(`Microphone unavailable for LiveKit (${err?.message || 'permission denied'}).`);
    }
  }

  return {
    room,
    attachElements: (nextVideoEl, nextAudioEl) => {
      if (nextVideoEl && nextVideoEl !== currentVideoEl) {
        currentVideoEl = nextVideoEl;
        if (activeVideoTrack) {
          activeVideoTrack.attach(currentVideoEl);
        }
      }
      if (nextAudioEl && nextAudioEl !== currentAudioEl) {
        currentAudioEl = nextAudioEl;
        if (teacherAudioTrack) {
          teacherAudioTrack.attach(currentAudioEl);
        }
      }
    },
    setTeacherMicEnabled: async (enabled) => {
      if (localAudioTrack) {
        if (enabled) await localAudioTrack.unmute();
        else await localAudioTrack.mute();
      }
    },
    setTeacherCamEnabled: async (enabled) => {
      if (localVideoTrack) {
        if (enabled) await localVideoTrack.unmute();
        else await localVideoTrack.mute();
      }
      onTrackStateChange?.({ hasVideo: Boolean(localVideoTrack && enabled) });
    },
    setStudentAudioOnly: (audioOnly) => {
      if (teacherVideoPub && typeof teacherVideoPub.setSubscribed === 'function') {
        teacherVideoPub.setSubscribed(!audioOnly);
        onTrackStateChange?.({ hasVideo: !audioOnly });
      }
    },
    setHindiAudioMuted: (muted) => {
      if (currentAudioEl) {
        currentAudioEl.muted = muted;
      }
      if (teacherAudioTrack && typeof teacherAudioTrack.setVolume === 'function') {
        teacherAudioTrack.setVolume(muted ? 0 : 1);
      }
    },
    disconnect: async () => {
      try {
        localVideoTrack?.stop();
        localAudioTrack?.stop();
        await room.disconnect();
      } catch (_) {}
    }
  };
}
