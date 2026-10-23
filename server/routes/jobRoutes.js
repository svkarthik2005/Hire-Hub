
const express = require("express");
const Job = require("../models/Job");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();

// Browse and search published jobs
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      filter.$or = [
        { title: { $regex: req.query.search.trim(), $options: "i" } },
        { company: { $regex: req.query.search.trim(), $options: "i" } },
        { skills: { $regex: req.query.search.trim(), $options: "i" } },
      ];
    }

    if (typeof req.query.location === "string" && req.query.location.trim()) {
      filter.location = {
        $regex: req.query.location.trim(),
        $options: "i",
      };
    }

    const jobs = await Job.find(filter)
      .populate("recruiter", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ jobs });
  } catch (error) {
    console.error("Job search failed:", error.message);
    res.status(500).json({ message: "Could not load jobs." });
  }
});

// Get one job
router.get("/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id)
      .populate("recruiter", "name");

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    res.json({ job });
  } catch {
    res.status(500).json({ message: "Could not load the job." });
  }
});

// Create a job (recruiters only)
router.post("/", protect, allowRoles("recruiter"), async (req, res) => {
  try {
    const { title, company, location, type, salary, description, skills } =
      req.body;

    if (
      typeof title !== "string" || !title.trim() || title.trim().length > 120 ||
      typeof company !== "string" || !company.trim() ||
      typeof location !== "string" || !location.trim() ||
      typeof description !== "string" || !description.trim() ||
      description.length > 10000 ||
      !["Full-time", "Part-time", "Contract", "Internship", "Remote"].includes(type) ||
      (salary !== undefined &&
        (typeof salary !== "string" || salary.length > 100)) ||
      (skills !== undefined &&
        (!Array.isArray(skills) ||
          skills.length > 30 ||
          !skills.every((skill) =>
            typeof skill === "string" && skill.length <= 50
          )))
    ) {
      return res.status(400).json({
        message: "Please provide valid job details.",
      });
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      type,
      salary: salary || "Not specified",
      description: description.trim(),
      skills: skills || [],
      recruiter: req.user._id,
    });

    res.status(201).json({
      message: "Job posted successfully.",
      job,
    });
  } catch (error) {
    console.error("Job creation failed:", error.message);
    res.status(500).json({ message: "Could not create the job." });
  }
});

// Edit your own job
router.put("/:id", protect, allowRoles("recruiter"), async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only edit your own jobs.",
      });
    }

    const fields = [
      "title", "company", "location", "type",
      "salary", "description", "skills",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        job.set(field, req.body[field]);
      }
    }

    await job.save();

    res.json({ message: "Job updated successfully.", job });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please check the job details.",
      });
    }

    res.status(500).json({ message: "Could not update the job." });
  }
});

// Delete your own job
router.delete("/:id", protect, allowRoles("recruiter"), async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own jobs.",
      });
    }

    await job.deleteOne();

    res.json({ message: "Job deleted successfully." });
  } catch {
    res.status(500).json({ message: "Could not delete the job." });
  }
});

module.exports = router;
