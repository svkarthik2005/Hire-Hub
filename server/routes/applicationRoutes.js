
const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();

// Applicant applies for a job
router.post("/", protect, allowRoles("applicant"), async (req, res) => {
  try {
    const { jobId, coverLetter = "" } = req.body;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (String(job.recruiter) === String(req.user._id)) {
      return res.status(400).json({
        message: "You cannot apply to your own job.",
      });
    }

    const application = await Application.create({
      job: job._id,
      applicant: req.user._id,
      recruiter: job.recruiter,
      coverLetter,
    });

    return res.status(201).json({
      message: "Application submitted successfully!",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already applied to this job.",
      });
    }

    console.error(error);
    return res.status(500).json({ message: "Could not submit application." });
  }
});

// Applicant views their applications
router.get("/mine", protect, allowRoles("applicant"), async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate("job", "title company location type salary")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Could not load applications." });
  }
});

// Recruiter views applications for their own jobs
router.get(
  "/recruiter",
  protect,
  allowRoles("recruiter"),
  async (req, res) => {
    try {
      const applications = await Application.find({
        recruiter: req.user._id,
      })
        .populate("job", "title company location")
        .populate("applicant", "name email")
        .sort({ createdAt: -1 });

      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Could not load applications." });
    }
  }
);

// Recruiter updates an application status
router.patch(
  "/:id/status",
  protect,
  allowRoles("recruiter"),
  async (req, res) => {
    try {
      const allowedStatuses = [
        "Reviewed",
        "Shortlisted",
        "Rejected",
        "Accepted",
      ];

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid application ID." });
      }

      const { status } = req.body;

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }

      const application = await Application.findOne({
        _id: req.params.id,
        recruiter: req.user._id,
      });

      if (!application) {
        return res.status(404).json({
          message: "Application not found or you do not have access.",
        });
      }

      application.status = status;
      await application.save();

      res.json({
        message: "Application status updated.",
        application,
      });
    } catch (error) {
      res.status(500).json({ message: "Could not update status." });
    }
  }
);

module.exports = router;
