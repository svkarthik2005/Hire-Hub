
import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const emptyJobForm = {
  title: "",
  company: "",
  location: "",
  type: "Full-time",
  salary: "",
  description: "",
};

const emptyEditForm = { ...emptyJobForm };

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "applicant",
  });

  const [form, setForm] = useState(emptyJobForm);
  const [showForm, setShowForm] = useState(false);
  const [detailsJob, setDetailsJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");

  const [showApplications, setShowApplications] = useState(false);
  const [recruiterMode, setRecruiterMode] = useState(false);
  const [showMyJobs, setShowMyJobs] = useState(false);

  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editMessage, setEditMessage] = useState("");

  const [applications, setApplications] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  function token() {
    return localStorage.getItem("token");
  }

  async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function fetchJobs() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/jobs`);
      const data = await readResponse(response);

      setJobs(
        Array.isArray(data)
          ? data
          : data.jobs || data.data || []
      );
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function checkLogin() {
    const savedToken = token();

    if (!savedToken) {
      setUser(null);
      return;
    }

    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });

      const data = await readResponse(response);

      if (!data.user) {
        throw new Error("Your login session is invalid.");
      }

      setUser(data.user);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  useEffect(() => {
    fetchJobs();
    checkLogin();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const query = search.trim().toLowerCase();
    const title = (job.title || job.jobTitle || "").toLowerCase();
    const company = (job.company || job.companyName || "").toLowerCase();
    const jobLocation = (job.location || "").toLowerCase();
    const jobType = (job.type || job.jobType || "").toLowerCase();

    return (
      (title.includes(query) || company.includes(query)) &&
      jobLocation.includes(location.trim().toLowerCase()) &&
      (!typeFilter || jobType === typeFilter.toLowerCase())
    );
  });

  const myPostedJobs = jobs.filter((job) => {
    const recruiterId =
      typeof job.recruiter === "object"
        ? job.recruiter?._id || job.recruiter?.id
        : job.recruiter;

    return (
      user?.role === "recruiter" &&
      recruiterId &&
      String(recruiterId) === String(user.id || user._id)
    );
  });

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateEditForm(event) {
    const { name, value } = event.target;
    setEditForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateAuthForm(event) {
    const { name, value } = event.target;
    setAuthForm((previous) => ({ ...previous, [name]: value }));
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthMessage("");
    setAuthForm({
      name: "",
      email: "",
      password: "",
      role: "applicant",
    });
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        authMode === "register"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!data.token || !data.user) {
        throw new Error("The server did not return an account session.");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setAuthMode("");
      setFormMessage(
        authMode === "register"
          ? "Account created successfully!"
          : "Welcome back! You are logged in."
      );
      setError("");
    } catch (err) {
      setAuthMessage(err.message || "Could not connect to the backend.");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setAuthMode("");
    setShowForm(false);
    setSelectedJob(null);
    setDetailsJob(null);
    setShowApplications(false);
    setShowMyJobs(false);
    setEditingJob(null);
    setApplications([]);
    setApplicationMessage("");
    setFormMessage("You have been logged out successfully.");
    setError("");
  }

  async function postJob(event) {
    event.preventDefault();
    setError("");
    setFormMessage("");
    setSubmitting(true);

    try {
      if (!user || user.role !== "recruiter") {
        throw new Error("Please log in with a recruiter account.");
      }

      const response = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim(),
          description: form.description.trim(),
          salary: form.salary.trim(),
        }),
      });

      await readResponse(response);

      setFormMessage("Job posted successfully!");
      setForm(emptyJobForm);
      setShowForm(false);
      setShowMyJobs(true);
      await fetchJobs();
    } catch (err) {
      setError(err.message || "Could not post the job.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(job) {
    setEditingJob(job);
    setEditForm({
      title: job.title || job.jobTitle || "",
      company: job.company || job.companyName || "",
      location: job.location || "",
      type: job.type || job.jobType || "Full-time",
      salary: job.salary || "",
      description: job.description || "",
    });
    setEditMessage("");
    setError("");
  }

  async function saveEditedJob(event) {
    event.preventDefault();

    if (!editingJob?._id) {
      setEditMessage("This job has no valid ID.");
      return;
    }

    setEditMessage("");
    setEditSubmitting(true);

    try {
      const response = await fetch(`${API}/jobs/${editingJob._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          company: editForm.company.trim(),
          location: editForm.location.trim(),
          type: editForm.type,
          salary: editForm.salary.trim(),
          description: editForm.description.trim(),
        }),
      });

      await readResponse(response);

      setEditingJob(null);
      setFormMessage("Job updated successfully!");
      await fetchJobs();
    } catch (err) {
      setEditMessage(err.message || "Could not update this job.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteJob(job) {
    const confirmed = window.confirm(
      `Delete "${job.title || job.jobTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setFormMessage("");

    try {
      const response = await fetch(`${API}/jobs/${job._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });

      await readResponse(response);

      setJobs((previous) =>
        previous.filter((item) => item._id !== job._id)
      );

      setFormMessage("Job deleted successfully.");
      if (detailsJob?._id === job._id) setDetailsJob(null);
    } catch (err) {
      setError(err.message || "Could not delete the job.");
    }
  }

  function openJobDetails(job) {
    setDetailsJob(job);
  }

  function startApplication(job) {
    if (!user) {
      setDetailsJob(null);
      openAuth("login");
      return;
    }

    if (user.role !== "applicant") {
      setApplicationMessage("Only applicant accounts can apply for jobs.");
      return;
    }

    setSelectedJob(job);
    setDetailsJob(null);
    setCoverLetter("");
    setApplicationMessage("");
  }

  async function applyForJob(event) {
    event.preventDefault();
    setApplicationMessage("");

    if (!user || user.role !== "applicant") {
      setApplicationMessage("Please log in with an applicant account.");
      return;
    }

    if (!selectedJob?._id) {
      setApplicationMessage("This job has no valid ID. Refresh the jobs list.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          jobId: selectedJob._id,
          coverLetter: coverLetter.trim(),
        }),
      });

      await readResponse(response);
      setApplicationMessage("Application submitted successfully!");
      setCoverLetter("");
    } catch (err) {
      setApplicationMessage(err.message || "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchApplications(forRecruiter = false) {
    setShowApplications(true);
    setShowMyJobs(false);
    setShowForm(false);
    setRecruiterMode(forRecruiter);
    setApplications([]);
    setApplicationMessage("");

    const requiredRole = forRecruiter ? "recruiter" : "applicant";

    if (!user || user.role !== requiredRole) {
      setApplicationMessage(
        `Please log in with a ${requiredRole} account to view applications.`
      );
      return;
    }

    setApplicationsLoading(true);

    try {
      const endpoint = forRecruiter
        ? "/applications/recruiter"
        : "/applications/mine";

      const response = await fetch(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await readResponse(response);

      setApplications(
        Array.isArray(data)
          ? data
          : data.applications || data.data || []
      );
    } catch (err) {
      setApplicationMessage(err.message || "Could not load applications.");
    } finally {
      setApplicationsLoading(false);
    }
  }

  async function updateApplicationStatus(applicationId, status) {
    setApplicationMessage("");

    try {
      const response = await fetch(
        `${API}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      await readResponse(response);
      setApplicationMessage("Application status updated successfully.");
      await fetchApplications(true);
      setApplicationMessage("Application status updated successfully.");
    } catch (err) {
      setApplicationMessage(err.message || "Could not update status.");
    }
  }

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: #f6f8fc; color: #172033; }
        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }
        button:disabled { opacity: .6; cursor: not-allowed; }
        .navbar { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:20px 7%; background:white; border-bottom:1px solid #e5eaf2; flex-wrap:wrap; }
        .logo { color:#2457d6; font-size:26px; font-weight:800; }
        .header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .welcome { color:#566176; font-size:14px; }
        .primary,.secondary,.danger { border:0; border-radius:9px; padding:12px 17px; font-weight:700; }
        .primary { background:#2457d6; color:white; }
        .primary:hover { background:#1946b7; }
        .secondary { background:#eaf0ff; color:#2457d6; }
        .danger { background:#fff0f0; color:#a32121; }
        .hero { padding:60px 7% 50px; color:white; background:linear-gradient(120deg,#173b96,#3978f6); }
        .hero h1 { margin:0 0 15px; max-width:700px; font-size:clamp(34px,5vw,54px); line-height:1.1; }
        .hero p { max-width:600px; color:#e2eaff; line-height:1.7; }
        .search-box { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; margin-top:28px; padding:14px; border-radius:14px; background:white; }
        input,select,textarea { width:100%; min-width:0; padding:13px; border:1px solid #d8deea; border-radius:8px; background:white; color:#172033; }
        .content { max-width:1200px; margin:auto; padding:40px 7%; min-height:280px; }
        .section-heading { display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom:24px; }
        .section-heading h2 { margin:0 0 8px; }
        .section-heading p { margin:0; color:#68738a; }
        .job-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
        .job-card,.panel,.form-card { padding:23px; background:white; border:1px solid #e4e9f2; border-radius:14px; box-shadow:0 4px 18px #1c315008; }
        .job-card h3 { margin:0 0 9px; font-size:21px; }
        .company { font-weight:700; color:#2457d6; }
        .details { color:#657087; font-size:14px; }
        .description { line-height:1.65; overflow-wrap:anywhere; white-space:pre-wrap; }
        .tag { display:inline-block; padding:6px 10px; margin-top:5px; border-radius:20px; background:#edf3ff; color:#2457d6; font-size:12px; font-weight:700; }
        .form-card { max-width:680px; margin:0 auto 35px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:15px; }
        .field { display:flex; flex-direction:column; gap:7px; margin-bottom:15px; }
        .full { grid-column:1/-1; }
        .notice,.error { margin:12px 0; padding:14px; border-radius:9px; line-height:1.5; }
        .notice { background:#eaf7ed; color:#17652d; }
        .error { background:#fff0f0; color:#a32121; }
        .job-actions { margin-top:17px; display:flex; gap:8px; flex-wrap:wrap; }
        .modal { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto; background:#0f172acc; }
        .modal-box { width:100%; max-width:560px; max-height:90vh; overflow-y:auto; padding:28px; border-radius:16px; background:white; box-shadow:0 20px 60px #0004; }
        .modal-box h2 { margin-top:0; }
        .applications { margin-bottom:35px; }
        .footer { padding:25px; text-align:center; color:#69758a; background:white; border-top:1px solid #e5eaf2; }
        .role-label { display:inline-block; margin-top:8px; padding:5px 9px; border-radius:20px; background:#eaf7ed; color:#17652d; font-size:12px; font-weight:700; text-transform:capitalize; }
        @media(max-width:700px) {
          .navbar { padding:17px 5%; align-items:flex-start; flex-direction:column; }
          .hero { padding:45px 5%; }
          .content { padding:30px 5%; }
          .search-box,.job-list,.form-grid { grid-template-columns:1fr; }
          .section-heading { align-items:flex-start; flex-direction:column; }
          .full { grid-column:auto; }
          .header-actions { width:100%; }
        }
      `}</style>

      <header className="navbar">
        <div>
          <div className="logo">Hire-Hub</div>
          {user && (
            <div className="welcome">
              Welcome, {user.name}
              <div className="role-label">{user.role} account</div>
            </div>
          )}
        </div>

        <div className="header-actions">
          {!user ? (
            <>
              <button className="secondary" onClick={() => openAuth("login")}>Log In</button>
              <button className="primary" onClick={() => openAuth("register")}>Create Account</button>
            </>
          ) : (
            <>
              {user.role === "applicant" && (
                <button className="secondary" onClick={() => fetchApplications(false)}>My Applications</button>
              )}

              {user.role === "recruiter" && (
                <>
                  <button className="secondary" onClick={() => {
                    setShowMyJobs(!showMyJobs);
                    setShowApplications(false);
                    setShowForm(false);
                    setError("");
                  }}>
                    {showMyJobs ? "Hide My Jobs" : "My Posted Jobs"}
                  </button>
                  <button className="secondary" onClick={() => fetchApplications(true)}>View Applicants</button>
                  <button className="primary" onClick={() => {
                    setShowForm(!showForm);
                    setShowMyJobs(false);
                    setShowApplications(false);
                    setError("");
                    setFormMessage("");
                  }}>
                    {showForm ? "Close Form" : "+ Post a Job"}
                  </button>
                </>
              )}

              <button className="danger" onClick={logout}>Log Out</button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <h1>Your next opportunity starts here.</h1>
        <p>Find work you love. Discover opportunities, build your career, and connect with great teams.</p>
        <div className="search-box">
          <input aria-label="Search jobs" placeholder="Search job title or company..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <input aria-label="Filter location" placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <select aria-label="Filter job type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All job types</option>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
            <option>Remote</option>
          </select>
        </div>
      </section>

      <main className="content">
        {formMessage && <div className="notice" role="status">{formMessage}</div>}
        {error && <div className="error" role="alert">{error}</div>}

        {!user && (
          <div className="panel" style={{ marginBottom: 25 }}>
            <strong>Welcome to Hire-Hub!</strong>
            <p>Log in or create an account to apply for jobs as an applicant or post jobs as a recruiter.</p>
            <button className="primary" onClick={() => openAuth("register")}>Get Started</button>
          </div>
        )}

        {user?.role === "applicant" && (
          <div className="panel" style={{ marginBottom: 25 }}>
            You are logged in as an <strong>applicant</strong>. Browse jobs and select View Details or Apply Now.
          </div>
        )}

        {user?.role === "recruiter" && (
          <div className="panel" style={{ marginBottom: 25 }}>
            You are logged in as a <strong>recruiter</strong>. Manage your jobs or publish a new opportunity.
          </div>
        )}

        {showForm && user?.role === "recruiter" && (
          <form className="form-card" onSubmit={postJob}>
            <h2>Post a new job</h2>
            <p>Enter the details of your opportunity below.</p>
            <div className="form-grid">
              <label className="field">Job title *
                <input name="title" value={form.title} onChange={updateForm} required maxLength={120} placeholder="Frontend Developer" />
              </label>
              <label className="field">Company *
                <input name="company" value={form.company} onChange={updateForm} required placeholder="Company name" />
              </label>
              <label className="field">Location *
                <input name="location" value={form.location} onChange={updateForm} required placeholder="Vijayawada or Remote" />
              </label>
              <label className="field">Job type *
                <select name="type" value={form.type} onChange={updateForm} required>
                  <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Remote</option>
                </select>
              </label>
              <label className="field">Salary (optional)
                <input name="salary" value={form.salary} onChange={updateForm} placeholder="e.g. ₹20,000 per month" />
              </label>
              <label className="field full">Job description *
                <textarea name="description" value={form.description} onChange={updateForm} required maxLength={10000} rows={5} placeholder="Describe the role and requirements..." />
              </label>
            </div>
            <button className="primary" type="submit" disabled={submitting}>{submitting ? "Posting..." : "Submit Job"}</button>
          </form>
        )}

        {showMyJobs && user?.role === "recruiter" && (
          <section className="applications">
            <div className="section-heading">
              <div>
                <h2>My Posted Jobs</h2>
                <p>Edit or delete the jobs you have already created.</p>
              </div>
              <button className="secondary" onClick={fetchJobs}>Refresh Jobs</button>
            </div>

            {loading ? (
              <div className="panel">Loading your jobs...</div>
            ) : myPostedJobs.length === 0 ? (
              <div className="panel">
                No jobs belonging to your recruiter account were found. Your existing jobs are not deleted; check the recruiter ID returned by the jobs API if this appears unexpectedly.
              </div>
            ) : (
              <div className="job-list">
                {myPostedJobs.map((job) => (
                  <article className="job-card" key={job._id}>
                    <h3>{job.title || job.jobTitle}</h3>
                    <p className="company">{job.company || job.companyName}</p>
                    <p className="details">📍 {job.location}</p>
                    <span className="tag">{job.type || job.jobType}</span>
                    {job.salary && <p className="details">Salary: {job.salary}</p>}
                    <p className="description">{job.description}</p>
                    <div className="job-actions">
                      <button className="secondary" onClick={() => openJobDetails(job)}>View Details</button>
                      <button className="primary" onClick={() => startEditing(job)}>Edit Job</button>
                      <button className="danger" onClick={() => deleteJob(job)}>Delete Job</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {showApplications && (
          <section className="applications">
            <div className="section-heading">
              <div>
                <h2>{recruiterMode ? "Applications for Your Jobs" : "My Applications"}</h2>
                <p>{recruiterMode ? "Review candidates and update their application status." : "Track your job application status."}</p>
              </div>
              <button className="secondary" onClick={() => setShowApplications(false)}>Close</button>
            </div>

            {applicationsLoading && <div className="panel">Loading applications...</div>}

            {applicationMessage && (
              <div className={applicationMessage.includes("successfully") ? "notice" : "error"} role="status">{applicationMessage}</div>
            )}

            {!applicationsLoading && !applicationMessage && applications.length === 0 && (
              <div className="panel">{recruiterMode ? "No applications have been received yet." : "You haven't applied for any jobs yet."}</div>
            )}

            {!applicationsLoading && applications.length > 0 && (
              <div className="job-list">
                {applications.map((application) => (
                  <article className="job-card" key={application._id}>
                    <h3>{application.job?.title || "Job no longer available"}</h3>
                    <p className="company">{application.job?.company || "Company"}</p>
                    <p className="details">Location: {application.job?.location || "Not specified"}</p>

                    {recruiterMode && (
                      <>
                        <p><strong>Applicant:</strong> {application.applicant?.name || "Unknown"}</p>
                        <p><strong>Email:</strong> {application.applicant?.email || "Not available"}</p>
                      </>
                    )}

                    <span className="tag">Status: {application.status || "Pending"}</span>

                    {application.coverLetter && <p className="description"><strong>Cover letter:</strong> {application.coverLetter}</p>}

                    <p className="details">Applied: {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "Date unavailable"}</p>

                    {recruiterMode && (
                      <label className="field">Update application status
                        <select value={application.status || "Pending"} onChange={(event) => updateApplicationStatus(application._id, event.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Accepted">Accepted</option>
                        </select>
                      </label>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <div className="section-heading">
            <div>
              <h2>Latest opportunities</h2>
              <p>Explore jobs currently available on Hire-Hub.</p>
            </div>
            <button className="secondary" onClick={fetchJobs}>Refresh Jobs</button>
          </div>

          {loading ? <div className="panel">Loading jobs...</div> : (
            <>
              <p className="details">{filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} found</p>
              {filteredJobs.length > 0 && (
                <div className="job-list">
                  {filteredJobs.map((job, index) => (
                    <article className="job-card" key={job._id || job.id || index}>
                      <h3>{job.title || job.jobTitle || "Untitled Job"}</h3>
                      <p className="company">{job.company || job.companyName || "Company"}</p>
                      <p className="details">📍 {job.location || "Location not specified"}</p>
                      {job.salary && <p className="details">Salary: {job.salary}</p>}
                      <span className="tag">{job.type || job.jobType || "Job"}</span>
                      <p className="description">{job.description || "No description provided."}</p>

                      <div className="job-actions">
                        <button className="secondary" type="button" onClick={() => openJobDetails(job)}>View Details</button>

                        {user?.role === "applicant" && (
                          <button className="primary" type="button" onClick={() => startApplication(job)}>Apply Now</button>
                        )}

                        {!user && <button className="primary" type="button" onClick={() => openAuth("login")}>Log in to Apply</button>}

                        {user?.role === "recruiter" && <span className="details">Manage your own jobs in My Posted Jobs.</span>}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {filteredJobs.length === 0 && (
                <div className="panel">
                  {jobs.length === 0 ? "No jobs found. Recruiters can log in and post opportunities." : "No matching jobs found. Try changing your search or filters."}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Job Details modal */}
      {detailsJob && (
        <div className="modal" onClick={(event) => {
          if (event.target === event.currentTarget) setDetailsJob(null);
        }}>
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="job-details-title">
            <h2 id="job-details-title">{detailsJob.title || detailsJob.jobTitle || "Job Details"}</h2>
            <p className="company">{detailsJob.company || detailsJob.companyName || "Company"}</p>
            <p className="details">📍 {detailsJob.location || "Location not specified"}</p>
            <p><strong>Job Type:</strong> {detailsJob.type || detailsJob.jobType || "Not specified"}</p>
            <p><strong>Salary:</strong> {detailsJob.salary || "Not specified"}</p>
            <h3>Job Description</h3>
            <p className="description">{detailsJob.description || "No description provided."}</p>

            {user?.role === "applicant" && (
              <button className="primary" onClick={() => startApplication(detailsJob)}>Apply Now</button>
            )}
            {!user && (
              <button className="primary" onClick={() => startApplication(detailsJob)}>Log in to Apply</button>
            )}
            <button className="secondary" style={{ marginLeft: 8 }} onClick={() => setDetailsJob(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Job modal */}
      {editingJob && (
        <div className="modal" onClick={(event) => {
          if (event.target === event.currentTarget && !editSubmitting) setEditingJob(null);
        }}>
          <form className="modal-box" onSubmit={saveEditedJob}>
            <h2>Edit Job</h2>
            <p>Update the details of your existing job.</p>
            {editMessage && <div className="error" role="alert">{editMessage}</div>}

            <label className="field">Job title *
              <input name="title" value={editForm.title} onChange={updateEditForm} required maxLength={120} />
            </label>
            <label className="field">Company *
              <input name="company" value={editForm.company} onChange={updateEditForm} required />
            </label>
            <label className="field">Location *
              <input name="location" value={editForm.location} onChange={updateEditForm} required />
            </label>
            <label className="field">Job type *
              <select name="type" value={editForm.type} onChange={updateEditForm} required>
                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Remote</option>
              </select>
            </label>
            <label className="field">Salary (optional)
              <input name="salary" value={editForm.salary} onChange={updateEditForm} placeholder="e.g. ₹20,000 per month" />
            </label>
            <label className="field">Job description *
              <textarea name="description" value={editForm.description} onChange={updateEditForm} required maxLength={10000} rows={5} />
            </label>

            <button className="primary" type="submit" disabled={editSubmitting}>{editSubmitting ? "Saving..." : "Save Changes"}</button>
            <button className="secondary" type="button" disabled={editSubmitting} style={{ marginLeft: 8 }} onClick={() => setEditingJob(null)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Login and registration modal */}
      {authMode && (
        <div className="modal" onClick={(event) => {
          if (event.target === event.currentTarget && !authLoading) setAuthMode("");
        }}>
          <form className="modal-box" onSubmit={submitAuth}>
            <h2>{authMode === "register" ? "Create your account" : "Welcome back"}</h2>
            <p>{authMode === "register" ? "Join Hire-Hub as an applicant or recruiter." : "Log in to continue to Hire-Hub."}</p>
            {authMessage && <div className="error" role="alert">{authMessage}</div>}

            {authMode === "register" && (
              <>
                <label className="field">Full name *
                  <input name="name" value={authForm.name} onChange={updateAuthForm} required maxLength={80} autoComplete="name" placeholder="Your name" />
                </label>
                <label className="field">I want to join as *
                  <select name="role" value={authForm.role} onChange={updateAuthForm} required>
                    <option value="applicant">Applicant — find and apply for jobs</option>
                    <option value="recruiter">Recruiter — post jobs and review applicants</option>
                  </select>
                </label>
              </>
            )}

            <label className="field">Email address *
              <input name="email" type="email" value={authForm.email} onChange={updateAuthForm} required autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="field">Password * (at least 8 characters)
              <input name="password" type="password" value={authForm.password} onChange={updateAuthForm} required minLength={8} maxLength={72} autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Enter your password" />
            </label>

            <button className="primary" type="submit" disabled={authLoading}>
              {authLoading ? "Please wait..." : authMode === "register" ? "Create Account" : "Log In"}
            </button>
            <button className="secondary" type="button" style={{ marginLeft: 8 }} onClick={() => {
              setAuthMode("");
              setAuthMessage("");
            }}>Cancel</button>

            <p style={{ marginTop: 22 }}>
              {authMode === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button type="button" className="secondary" onClick={() => openAuth(authMode === "register" ? "login" : "register")}>
                {authMode === "register" ? "Log In" : "Register"}
              </button>
            </p>
          </form>
        </div>
      )}

      {/* Apply for Job modal */}
      {selectedJob && (
        <div className="modal" onClick={(event) => {
          if (event.target === event.currentTarget && !submitting) setSelectedJob(null);
        }}>
          <form className="modal-box" onSubmit={applyForJob}>
            <h2>Apply for {selectedJob.title || selectedJob.jobTitle || "this job"}</h2>
            <p className="company">{selectedJob.company || selectedJob.companyName || "Company"}</p>
            <p className="details">{selectedJob.location || "Location not specified"}</p>

            {applicationMessage && (
              <div className={applicationMessage.includes("successfully") ? "notice" : "error"} role="status">{applicationMessage}</div>
            )}

            <label className="field">Cover letter (optional)
              <textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} maxLength={3000} rows={5} placeholder="Tell the recruiter why you're interested..." />
            </label>

            <button className="primary" type="submit" disabled={submitting || applicationMessage.includes("successfully")}>
              {submitting ? "Submitting..." : applicationMessage.includes("successfully") ? "Application Submitted" : "Submit Application"}
            </button>
            <button className="secondary" type="button" disabled={submitting} onClick={() => setSelectedJob(null)} style={{ marginLeft: 8 }}>Close</button>
          </form>
        </div>
      )}

      <footer className="footer">© 2026 Hire-Hub. Connecting people with opportunities.</footer>
    </div>
  );
}
