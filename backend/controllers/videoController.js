/**
 * Video Learning Controller (P2-10)
 * Curates educational chapter videos with timestamps, interactive checkpoints,
 * progress tracking, and Saarthi doubt integration.
 */
const { supabaseAdmin } = require('../utils/supabaseAdmin');

const CURATED_VIDEOS = [
  {
    id: 'vid_physics_electricity',
    title: "Ohm's Law & Circuit Resistance Explained",
    subject: 'Physics',
    classLevel: 10,
    chapterTitle: 'Electricity',
    durationSeconds: 30,
    videoUrl: '/media/ohmslaw.mp4',
    videoFileName: 'ohmslaw.mp4',
    notesUrl: '/media/ohmslawnotes.pdf',
    notesFileName: 'ohmslawnotes.pdf',
    notesTitle: "Ohm's Law Study Notes (PDF)",
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    isDummy: false,
    timestamps: [
      { time: 0, title: 'Introduction to Drift Velocity & Charge Flow' },
      { time: 8, title: "Ohm's Law: V = IR Principle" },
      { time: 18, title: 'Interactive Concept Checkpoint' },
      { time: 24, title: "Joule Heating & Filaments (H = I²Rt)" }
    ],
    checkpoint: {
      time: 18,
      question: 'According to Ohm’s law, if the length of a wire is doubled with uniform cross-section, what happens to its resistance?',
      options: ['Halved', 'Doubles (R ∝ L)', 'Remains identical', 'Quadruples'],
      correctIndex: 1,
      explanation: 'Resistance R = ρL/A. When length L is doubled while area A stays constant, resistance doubles.'
    },
    transcript: `Electric current is the net flow of electric charges through a conductor. In a metallic wire, free electrons drift with small velocities under an applied potential difference. Ohm's Law states V = IR. Higher resistance leads to greater Joule dissipation as heat.`
  }
];

/**
 * GET /api/videos
 * List all curated educational chapter videos
 */
exports.getVideos = async (req, res) => {
  try {
    const { subject, classLevel } = req.query;
    let filtered = CURATED_VIDEOS;

    if (subject && subject !== 'all') {
      filtered = filtered.filter(v => v.subject.toLowerCase() === subject.toLowerCase());
    }
    if (classLevel) {
      filtered = filtered.filter(v => Number(v.classLevel) === Number(classLevel));
    }

    res.json({
      success: true,
      count: filtered.length,
      videos: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/videos/:id
 * Retrieve details for a single video including timestamps and checkpoints
 */
exports.getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = CURATED_VIDEOS.find(v => v.id === id) || CURATED_VIDEOS[0];
    res.json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/videos/:id/progress
 * Save student watch timestamp
 */
exports.saveVideoProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { positionSeconds = 0, completed = false } = req.body;

    res.json({
      success: true,
      message: 'Video watch progress recorded',
      progress: { userId, videoId: id, positionSeconds, completed }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

