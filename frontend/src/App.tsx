

import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

interface Sender {
  id: string;
  email: string;
}

interface Email {
  id: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  sender?: Sender;
  senderEmail?: string;
  recipients: {
    id?: string;
    address?: string;
    status?: string;
  }[];
}

function App() {
  // Google authentication
  const [loggedInUser, setLoggedInUser] = useState<{
    id: string;
    name: string | null;
    email: string;
  } | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleGoogleLogin(credential: string) {
    try {
      setAuthLoading(true);
      setAuthError("");

      const response = await fetch(
        "http://localhost:5000/api/auth/google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ credential })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Google login failed");
      }

      setLoggedInUser(data.user);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setAuthLoading(false);
    }
  }

  // Dashboard navigation
  const [page, setPage] = useState("Dashboard");

  // Sender states
  const [sender, setSender] = useState("");
  const [senders, setSenders] = useState<Sender[]>([]);

  // Compose email states
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [loadingSenders, setLoadingSenders] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Email states
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Dashboard statistics
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  // Recent activity
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Settings states
  const [hourlyLimit, setHourlyLimit] = useState("100");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch senders
  useEffect(() => {
    async function fetchSenders() {
      try {
        const response = await fetch("http://localhost:5000/api/senders");

        if (!response.ok) {
          throw new Error("Unable to fetch senders");
        }

        const data = await response.json();

        if (data.success) {
          setSenders(data.senders || []);

          if (data.senders?.length > 0) {
            setSender(data.senders[0].id);
          }
        }
      } catch (error) {
        console.error(error);
        setError("Unable to load senders.");
      } finally {
        setLoadingSenders(false);
      }
    }

    fetchSenders();
  }, []);

  // Fetch scheduled and sent emails
  useEffect(() => {
    if (page !== "Scheduled Emails" && page !== "Sent Emails") {
      return;
    }

    async function fetchEmails() {
      setLoadingEmails(true);
      setError("");

      const endpoint =
        page === "Scheduled Emails" ? "scheduled" : "sent";

      try {
        const response = await fetch(
          `http://localhost:5000/api/emails/${endpoint}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to fetch emails");
        }

        setEmails(data.emails || []);
      } catch (error) {
        console.error("Email fetch error:", error);
        setEmails([]);
        setError(
          error instanceof Error ? error.message : "Unable to fetch emails."
        );
      } finally {
        setLoadingEmails(false);
      }
    }

    fetchEmails();
  }, [page]);

  // Fetch dashboard statistics
  useEffect(() => {
    if (page !== "Dashboard") return;

    async function fetchStats() {
      try {
        setLoadingStats(true);

        const [scheduledResponse, sentResponse] = await Promise.all([
          fetch("http://localhost:5000/api/emails/scheduled"),
          fetch("http://localhost:5000/api/emails/sent")
        ]);

        if (!scheduledResponse.ok || !sentResponse.ok) {
          throw new Error("Unable to fetch dashboard statistics");
        }

        const scheduledData = await scheduledResponse.json();
        const sentData = await sentResponse.json();

        setScheduledCount(scheduledData.count || 0);
        setSentCount(sentData.count || 0);
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
  }, [page]);

  // Fetch recent email activity
  useEffect(() => {
    if (page !== "Dashboard") return;

    async function fetchRecentEmails() {
      try {
        setLoadingRecent(true);

        const [scheduledResponse, sentResponse] = await Promise.all([
          fetch("http://localhost:5000/api/emails/scheduled"),
          fetch("http://localhost:5000/api/emails/sent")
        ]);

        const scheduledData = await scheduledResponse.json();
        const sentData = await sentResponse.json();

        if (
          !scheduledResponse.ok ||
          !sentResponse.ok ||
          !scheduledData.success ||
          !sentData.success
        ) {
          throw new Error("Unable to load recent activity");
        }

        const combined: Email[] = [
          ...(scheduledData.emails || []),
          ...(sentData.emails || [])
        ];

        combined.sort((a, b) => {
          const dateA = new Date(
            a.sentAt || a.scheduledAt
          ).getTime();

          const dateB = new Date(
            b.sentAt || b.scheduledAt
          ).getTime();

          return dateB - dateA;
        });

        setRecentEmails(combined.slice(0, 5));
      } catch (error) {
        console.error("Recent activity error:", error);
      } finally {
        setLoadingRecent(false);
      }
    }

    fetchRecentEmails();
  }, [page]);

  // Fetch current hourly limit when Settings page opens
  useEffect(() => {
    if (page !== "Settings") return;

    async function fetchSettings() {
      try {
        setLoadingSettings(true);
        setSettingsError("");
        setSettingsMessage("");

        const response = await fetch(
          "http://localhost:5000/api/settings/rate-limit"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load settings");
        }

        setHourlyLimit(String(data.emailsPerHourLimit));
      } catch (error) {
        setSettingsError(
          error instanceof Error ? error.message : "Unable to load settings"
        );
      } finally {
        setLoadingSettings(false);
      }
    }

    fetchSettings();
  }, [page]);

  // Save hourly limit
  async function handleSaveSettings() {
    setSettingsError("");
    setSettingsMessage("");

    const limit = Number(hourlyLimit);

    if (!Number.isInteger(limit) || limit < 1) {
      setSettingsError("Please enter a valid positive whole number.");
      return;
    }

    try {
      setSavingSettings(true);

      const response = await fetch(
        "http://localhost:5000/api/settings/rate-limit",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emailsPerHourLimit: limit
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save settings");
      }

      setHourlyLimit(String(data.emailsPerHourLimit));
      setSettingsMessage("Hourly email limit updated successfully!");
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : "Unable to save settings"
      );
    } finally {
      setSavingSettings(false);
    }
  }

  // Validate recipients
  const recipientList = [
    ...new Set(
      recipients
        .split(/[\s,;]+/)
        .map(email => email.trim().toLowerCase())
        .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  ];

  // Upload CSV or TXT
  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const content = await file.text();

    const foundEmails =
      content.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      ) || [];

    setRecipients(
      [...new Set(foundEmails.map(email => email.toLowerCase()))].join("\n")
    );

    event.target.value = "";
  }

  // Schedule email
  async function handleScheduleEmail() {
    setError("");
    setSuccess("");

    if (
      !sender ||
      !recipients.trim() ||
      !subject.trim() ||
      !body.trim() ||
      !scheduledAt
    ) {
      setError("Please fill all fields.");
      return;
    }

    if (recipientList.length === 0) {
      setError("Please enter at least one valid recipient.");
      return;
    }

    const scheduledDate = new Date(scheduledAt);

    if (scheduledDate <= new Date()) {
      setError("Please select a future date and time.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "http://localhost:5000/api/schedule-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            senderId: sender,
            recipients: recipientList,
            subject,
            body,
            scheduledAt: scheduledDate.toISOString()
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Scheduling failed");
      }

      setSuccess("Email scheduled successfully!");

      setRecipients("");
      setSubject("");
      setBody("");
      setScheduledAt("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Refresh current email list
  async function refreshEmails() {
    const endpoint =
      page === "Scheduled Emails" ? "scheduled" : "sent";

    try {
      setLoadingEmails(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/emails/${endpoint}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to refresh emails");
      }

      setEmails(data.emails || []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Refresh failed"
      );
    } finally {
      setLoadingEmails(false);
    }
  }

  // Elasticsearch Search
  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchError("Please enter something to search.");
      setSearchResults([]);
      return;
    }

    try {
      setLoadingSearch(true);
      setSearchError("");
      setSearchResults([]);

      const response = await fetch(
        `http://localhost:5000/api/emails/search?q=${encodeURIComponent(searchQuery)}`
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Search failed");
      }

      const results =
        data.results ||
        data.emails ||
        data.hits?.hits?.map((hit: any) => hit._source) ||
        [];

      setSearchResults(results);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Search failed"
      );
    } finally {
      setLoadingSearch(false);
    }
  }

  // Google Login Screen
  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-blue-500">
            ReachInbox
          </h1>

          <p className="text-xs text-slate-500 mt-2">
            Email Scheduler
          </p>

          <h2 className="text-xl font-semibold mt-8">
            Welcome Back!
          </h2>

          <p className="text-slate-400 text-sm mt-2 mb-6">
            Sign in with Google to continue.
          </p>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  handleGoogleLogin(response.credential);
                }
              }}
              onError={() => {
                setAuthError("Google login was unsuccessful.");
              }}
            />
          </div>

          {authLoading && (
            <p className="text-blue-400 mt-4">
              Signing in...
            </p>
          )}

          {authError && (
            <p className="text-red-400 mt-4 text-sm">
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6">
        <h1 className="text-2xl font-bold text-blue-500">
          ReachInbox
        </h1>

        <p className="text-xs text-slate-500 mt-1">
          Email Scheduler
        </p>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-sm text-slate-300">
            {loggedInUser.name || "Welcome"}
          </p>
          <p className="text-xs text-slate-500 break-all mt-1">
            {loggedInUser.email}
          </p>
        </div>

        <nav className="mt-8 space-y-3">
          {[
            "Dashboard",
            "Compose Email",
            "Scheduled Emails",
            "Sent Emails",
            "Search Emails",
            "Settings"
          ].map(item => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`w-full text-left p-3 rounded-lg ${
                page === item
                  ? "bg-blue-600"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}

          <button
            onClick={() => {
              setLoggedInUser(null);
              setPage("Dashboard");
            }}
            className="w-full text-left p-3 rounded-lg text-red-400 hover:bg-slate-800"
          >
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Dashboard */}
        {page === "Dashboard" && (
          <>
            <h2 className="text-3xl font-bold">Dashboard</h2>

            <p className="text-slate-400 mt-2">
              Welcome to your email scheduling workspace.
            </p>

            <div className="grid grid-cols-3 gap-6 mt-10">
              {[
                {
                  title: "Total Emails",
                  count: scheduledCount + sentCount
                },
                {
                  title: "Scheduled Emails",
                  count: scheduledCount
                },
                {
                  title: "Sent Emails",
                  count: sentCount
                }
              ].map(item => (
                <div
                  key={item.title}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-xl"
                >
                  <p className="text-slate-400">{item.title}</p>

                  <h3 className="text-3xl font-bold mt-3">
                    {loadingStats ? "..." : item.count}
                  </h3>
                </div>
              ))}
            </div>

            {/* Recent Email Activity */}
            <div className="mt-10 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  Recent Email Activity
                </h3>

                <span className="text-xs text-slate-500">
                  Latest 5 emails
                </span>
              </div>

              {loadingRecent ? (
                <p className="text-slate-400 mt-6">
                  Loading activity...
                </p>
              ) : recentEmails.length === 0 ? (
                <p className="text-slate-500 mt-8 text-center">
                  No recent email activity found.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {recentEmails.map(email => (
                    <div
                      key={email.id}
                      className="flex justify-between items-center gap-4 border-b border-slate-800 pb-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {email.subject}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {email.sender?.email || "Email Scheduler"}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(
                            email.sentAt || email.scheduledAt
                          ).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          email.status === "SENT"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {email.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Compose Email */}
        {page === "Compose Email" && (
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold">Compose Email</h2>

            <p className="text-slate-400 mt-2">
              Create and schedule your email campaign.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <label className="block mb-2 text-sm text-slate-300">
                  Select Sender
                </label>

                <select
                  value={sender}
                  onChange={e => setSender(e.target.value)}
                  disabled={loadingSenders}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                >
                  <option value="">
                    {loadingSenders ? "Loading senders..." : "Select sender"}
                  </option>

                  {senders.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm text-slate-300">
                  Recipients
                </label>

                <textarea
                  value={recipients}
                  onChange={e => setRecipients(e.target.value)}
                  placeholder="Enter email addresses separated by commas or new lines"
                  rows={5}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                />

                <div className="flex justify-between mt-2">
                  <label className="text-sm text-blue-400 cursor-pointer">
                    Upload CSV / TXT

                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <span className="text-sm text-slate-400">
                    {recipientList.length} valid recipients
                  </span>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm text-slate-300">
                  Subject
                </label>

                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-slate-300">
                  Email Message
                </label>

                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your email..."
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-slate-300">
                  Schedule Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {success && (
                <p className="text-green-400 text-sm">{success}</p>
              )}

              <button
                type="button"
                onClick={handleScheduleEmail}
                disabled={
                  loadingSenders ||
                  senders.length === 0 ||
                  submitting
                }
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium"
              >
                {submitting ? "Scheduling..." : "Schedule Email"}
              </button>
            </div>
          </div>
        )}

        {/* Scheduled and Sent Emails */}
        {(page === "Scheduled Emails" || page === "Sent Emails") && (
          <div>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold">{page}</h2>
                <p className="text-slate-400 mt-2">
                  Manage your email records.
                </p>
              </div>

              <button
                onClick={refreshEmails}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
              >
                Refresh
              </button>
            </div>

            {loadingEmails && (
              <p className="text-slate-400 mt-8">Loading emails...</p>
            )}

            {error && (
              <p className="text-red-400 mt-8">{error}</p>
            )}

            {!loadingEmails && !error && emails.length === 0 && (
              <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400">
                  No {page.toLowerCase()} found.
                </p>
              </div>
            )}

            {!loadingEmails && emails.length > 0 && (
              <div className="mt-8 space-y-4">
                <p className="text-slate-400">
                  Total records: {emails.length}
                </p>

                {emails.map(email => (
                  <div
                    key={email.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                  >
                    <div className="flex justify-between gap-4">
                      <h3 className="text-lg font-semibold">
                        {email.subject}
                      </h3>

                      <span
                        className={`text-sm ${
                          email.status === "SENT"
                            ? "text-green-400"
                            : "text-blue-400"
                        }`}
                      >
                        {email.status}
                      </span>
                    </div>

                    <p className="text-slate-400 text-sm mt-3">
                      From: {email.sender?.email}
                    </p>

                    <p className="text-slate-400 text-sm mt-2">
                      To: {email.recipients
                        .map(r => r.address)
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    <p className="text-slate-300 mt-4 whitespace-pre-wrap">
                      {email.body}
                    </p>

                    <div className="border-t border-slate-800 mt-4 pt-4 text-xs text-slate-500">
                      <p>
                        Scheduled: {new Date(email.scheduledAt).toLocaleString()}
                      </p>

                      {email.sentAt && (
                        <p className="mt-2">
                          Sent: {new Date(email.sentAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Emails */}
        {page === "Search Emails" && (
          <div>
            <h2 className="text-3xl font-bold">Search Emails</h2>

            <p className="text-slate-400 mt-2">
              Search your emails using Elasticsearch.
            </p>

            <div className="flex gap-3 mt-8 max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search by subject, content or recipient..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3"
              />

              <button
                onClick={handleSearch}
                disabled={loadingSearch}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 rounded-lg"
              >
                {loadingSearch ? "Searching..." : "Search"}
              </button>
            </div>

            {searchError && (
              <p className="text-red-400 mt-4">{searchError}</p>
            )}

            {!loadingSearch && searchQuery.trim() !== "" && (
              <p className="text-slate-400 mt-6">
                Results found: {searchResults.length}
              </p>
            )}

            {loadingSearch && (
              <p className="text-slate-400 mt-6">Searching emails...</p>
            )}

            <div className="mt-6 space-y-4">
              {searchResults.map((email, index) => (
                <div
                  key={email.id || index}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  <div className="flex justify-between gap-4">
                    <h3 className="text-lg font-semibold">
                      {email.subject || "No Subject"}
                    </h3>

                    <span className="text-sm text-green-400">
                      {email.status || "Found"}
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm mt-3">
                    From: {email.senderEmail || email.sender?.email || "N/A"}
                  </p>

                  <p className="text-slate-400 text-sm mt-2">
                    To: {
                      Array.isArray(email.recipients)
                        ? email.recipients
                            .map(r => typeof r === "string" ? r : r.address)
                            .filter(Boolean)
                            .join(", ")
                        : "N/A"
                    }
                  </p>

                  <p className="text-slate-300 mt-4 whitespace-pre-wrap">
                    {email.body || "No message content"}
                  </p>
                </div>
              ))}
            </div>

            {!loadingSearch &&
              searchQuery.trim() !== "" &&
              searchResults.length === 0 &&
              !searchError && (
                <p className="text-slate-500 mt-8">
                  No matching emails found.
                </p>
              )}
          </div>
        )}

        {/* Settings */}
        {page === "Settings" && (
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold">Settings</h2>

            <p className="text-slate-400 mt-2">
              Manage your email scheduler configuration.
            </p>

            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold">
                Email Rate Limit
              </h3>

              <p className="text-slate-400 text-sm mt-2">
                Set the maximum number of emails that can be sent per hour.
              </p>

              {loadingSettings ? (
                <p className="text-slate-400 mt-6">
                  Loading settings...
                </p>
              ) : (
                <>
                  <div className="mt-6">
                    <label className="block text-sm text-slate-300 mb-2">
                      Maximum emails per hour
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={hourlyLimit}
                      onChange={e => {
                        setHourlyLimit(e.target.value);
                        setSettingsMessage("");
                        setSettingsError("");
                      }}
                      className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                    />

                    <p className="text-xs text-slate-500 mt-2">
                      Current configured limit: {hourlyLimit} emails/hour
                    </p>
                  </div>

                  {settingsError && (
                    <p className="text-red-400 text-sm mt-4">
                      {settingsError}
                    </p>
                  )}

                  {settingsMessage && (
                    <p className="text-green-400 text-sm mt-4">
                      {settingsMessage}
                    </p>
                  )}

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
