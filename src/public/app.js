const app = document.querySelector("#app");

const money = value =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));

const escapeHTML = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
  );

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed."
    );
  }

  return data;
}

function page(title, body) {
  app.innerHTML = `
    <section class="wrap">

      <div class="heading">
        <div>
          <small>TESLA INVESTMENT</small>
          <h1>${title}</h1>
        </div>

        <button
          class="light"
          onclick="logout()"
        >
          Log out
        </button>
      </div>

      ${body}

    </section>
  `;
}

function message(text, type = "") {
  const element =
    document.querySelector("#message");

  if (!element) return;

  element.textContent = text;
  element.className = `message ${type}`;
}

function home() {
  app.innerHTML = `
    <section class="wrap hero">

      <div>

        <span class="pill">
          INDEPENDENT PLATFORM PROTOTYPE
        </span>

        <h1>
          Investment management,
          redesigned for clarity.
        </h1>

        <p>
          Tesla Investment is a modern demonstration
          of client accounts, portfolio views and
          manager workflows.
        </p>

        <button onclick="login()">
          Sign in
        </button>

        <button
          class="light"
          onclick="register()"
        >
          Create account
        </button>

      </div>

      <div class="heroCard">

        <b>TI</b>

        <small>PORTFOLIO DEMO</small>

        <h2>
          Simple. Focused. Transparent.
        </h2>

        <p>
          Fictional portfolio data for
          software demonstration.
        </p>

        <strong>$8,562.50</strong>

      </div>

    </section>

    <section class="features">

      <article>
        <b>01</b>
        <h3>Client accounts</h3>
        <p>
          Registration and secure password
          authentication.
        </p>
      </article>

      <article>
        <b>02</b>
        <h3>Portfolio dashboard</h3>
        <p>
          Fictional holdings, transactions
          and account requests.
        </p>
      </article>

      <article>
        <b>03</b>
        <h3>Manager console</h3>
        <p>
          Review clients and demo
          workflow requests.
        </p>
      </article>

    </section>
  `;
}

function login() {
  page(
    "Sign in",
    `
    <div class="card auth">

      <small>SECURE DEMO ACCESS</small>

      <h2>Welcome back</h2>

      <div id="message"></div>

      <form onsubmit="doLogin(event)">

        <label>
          Email
          <input
            id="loginEmail"
            type="email"
            required
          >
        </label>

        <label>
          Password
          <input
            id="loginPassword"
            type="password"
            required
          >
        </label>

        <button>
          Continue
        </button>

      </form>

      <div class="demo">

        <b>Demo accounts</b>

        <p>
          Client:
          client@example.com /
          demo123
        </p>

        <p>
          Manager:
          manager@example.com /
          demo123
        </p>

      </div>

    </div>
    `
  );
}

async function doLogin(event) {
  event.preventDefault();

  try {
    const data = await api(
      "/api/login",
      {
        method: "POST",
        body: JSON.stringify({
          email:
            document.querySelector(
              "#loginEmail"
            ).value,

          password:
            document.querySelector(
              "#loginPassword"
            ).value
        })
      }
    );

    if (data.role === "manager") {
      managerDashboard();
    } else {
      clientDashboard();
    }

  } catch (error) {
    message(
      error.message,
      "error"
    );
  }
}

function register() {
  page(
    "Create account",
    `
    <div class="card auth">

      <small>CLIENT REGISTRATION</small>

      <h2>
        Start your demo account
      </h2>

      <div id="message"></div>

      <form onsubmit="doRegister(event)">

        <label>
          Name
          <input id="registerName" required>
        </label>

        <label>
          Email
          <input
            id="registerEmail"
            type="email"
            required
          >
        </label>

        <label>
          Password
          <input
            id="registerPassword"
            type="password"
            minlength="8"
            required
          >
        </label>

        <button>
          Create account
        </button>

      </form>

      <p class="note">
        Demo only. Do not enter real
        financial credentials.
      </p>

    </div>
    `
  );
}

async function doRegister(event) {
  event.preventDefault();

  try {
    await api(
      "/api/register",
      {
        method: "POST",
        body: JSON.stringify({
          name:
            document.querySelector(
              "#registerName"
            ).value,

          email:
            document.querySelector(
              "#registerEmail"
            ).value,

          password:
            document.querySelector(
              "#registerPassword"
            ).value
        })
      }
    );

    clientDashboard();

  } catch (error) {
    message(
      error.message,
      "error"
    );
  }
}

async function logout() {
  await api(
    "/api/logout",
    {
      method: "POST"
    }
  );

  home();
}

async function clientDashboard() {
  try {
    const data =
      await api(
        "/api/client/dashboard"
      );

    page(
      "Client dashboard",
      `
      <div class="welcome">

        <div>
          <small>CLIENT SPACE</small>

          <h2>
            Welcome,
            ${escapeHTML(data.user.name)}
          </h2>
        </div>

        <span class="status active">
          ${escapeHTML(data.user.status)}
        </span>

      </div>

      <div class="stats">

        <div>
          <small>Portfolio value</small>

          <b>
            ${money(data.total)}
          </b>

          <em>
            Fictional demo value
          </em>
        </div>

        <div>
          <small>Holdings</small>

          <b>
            ${data.holdings.length}
          </b>

          <em>
            Demo positions
          </em>
        </div>

        <div>
          <small>Requests</small>

          <b>
            ${data.requests.length}
          </b>

          <em>
            Workflow records
          </em>
        </div>

      </div>

      <div class="grid">

        <section class="card">

          <small>PORTFOLIO</small>

          <h2>Holdings</h2>

          <table>

            <tr>
              <th>Asset</th>
              <th>Shares</th>
              <th>Price</th>
              <th>Value</th>
            </tr>

            ${data.holdings.map(item => `
              <tr>

                <td>
                  <b>
                    ${escapeHTML(
                      item.symbol
                    )}
                  </b>

                  <small>
                    ${escapeHTML(
                      item.name
                    )}
                  </small>
                </td>

                <td>
                  ${item.shares}
                </td>

                <td>
                  ${money(item.price)}
                </td>

                <td>
                  ${money(item.value)}
                </td>

              </tr>
            `).join("")}

          </table>

        </section>

        <section class="card">

          <small>
            ACCOUNT WORKFLOW
          </small>

          <h2>Request</h2>

          <div id="message"></div>

          <label>
            Type

            <select id="requestType">

              <option value="deposit">
                Deposit request
              </option>

              <option value="withdrawal">
                Withdrawal request
              </option>

            </select>
          </label>

          <label>
            Amount

            <input
              id="requestAmount"
              type="number"
              min="1"
              step="0.01"
            >
          </label>

          <button
            onclick="requestDemo()"
          >
            Submit demo request
          </button>

          <p class="note">
            No money moves.
          </p>

        </section>

      </div>

      <div class="grid">

        <section class="card">

          <small>TRANSACTIONS</small>

          <h2>History</h2>

          ${
            data.transactions.map(item => `
              <div class="row">

                <span>
                  <b>
                    ${escapeHTML(
                      item.type
                    )}
                  </b>

                  <small>
                    ${escapeHTML(
                      item.note || ""
                    )}
                  </small>
                </span>

                <b>
                  ${money(item.amount)}
                </b>

              </div>
            `).join("")
            ||
            "<p class='note'>No transactions.</p>"
          }

        </section>

        <section class="card">

          <small>REQUESTS</small>

          <h2>Requests</h2>

          ${
            data.requests.map(item => `
              <div class="row">

                <span>
                  <b>
                    ${escapeHTML(
                      item.type
                    )}
                  </b>

                  <small>
                    #${item.id}
                  </small>
                </span>

                <span class="status ${item.status}">
                  ${escapeHTML(
                    item.status
                  )}
                </span>

              </div>
            `).join("")
            ||
            "<p class='note'>No requests.</p>"
          }

        </section>

      </div>

      <div class="grid">

        <section class="card">

          <small>NOTIFICATIONS</small>

          <h2>Updates</h2>

          ${data.notifications.map(item => `
            <div class="noteBox">

              <b>
                ${escapeHTML(
                  item.title
                )}
              </b>

              <p>
                ${escapeHTML(
                  item.body
                )}
              </p>

            </div>
          `).join("")}

        </section>

        <section class="card">

          <small>DOCUMENTS</small>

          <h2>Documents</h2>

          ${data.documents.map(item => `
            <div class="row">

              <span>

                <b>
                  ${escapeHTML(
                    item.title
                  )}
                </b>

                <small>
                  ${escapeHTML(
                    item.category
                  )}
                </small>

              </span>

              <span class="status available">
                Available
              </span>

            </div>
          `).join("")}

        </section>

      </div>
      `
    );

  } catch {
    login();
  }
}

async function requestDemo() {
  try {
    await api(
      "/api/client/request",
      {
        method: "POST",

        body: JSON.stringify({
          type:
            document.querySelector(
              "#requestType"
            ).value,

          amount:
            document.querySelector(
              "#requestAmount"
            ).value
        })
      }
    );

    message(
      "Demo request submitted.",
      "success"
    );

    setTimeout(
      clientDashboard,
      700
    );

  } catch (error) {
    message(
      error.message,
      "error"
    );
  }
}

async function managerDashboard() {
  try {
    const data =
      await api(
        "/api/manager/overview"
      );

    page(
      "Manager dashboard",
      `
      <div class="welcome">

        <div>
          <small>
            MANAGEMENT CONSOLE
          </small>

          <h2>
            Tesla Investment
          </h2>
        </div>

        <span class="status active">
          MANAGER
        </span>

      </div>

      <div class="stats">

        <div>
          <small>Clients</small>

          <b>
            ${data.stats.clients}
          </b>

          <em>
            Demo accounts
          </em>
        </div>

        <div>
          <small>
            Pending requests
          </small>

          <b>
            ${data.stats.pendingRequests}
          </b>

          <em>
            Awaiting review
          </em>
        </div>

        <div>
          <small>Demo assets</small>

          <b>
            ${money(
              data.stats.demoAssets
            )}
          </b>

          <em>
            Fictional data
          </em>
        </div>

      </div>

      <section class="card">

        <small>
          CLIENT MANAGEMENT
        </small>

        <h2>Accounts</h2>

        <table>

          <tr>
            <th>Client</th>
            <th>Email</th>
            <th>Status</th>
            <th>Controls</th>
          </tr>

          ${data.clients.map(client => `
            <tr>

              <td>
                <b>
                  ${escapeHTML(
                    client.name
                  )}
                </b>
              </td>

              <td>
                ${escapeHTML(
                  client.email
                )}
              </td>

              <td>
                <span class="status ${client.status}">
                  ${escapeHTML(
                    client.status
                  )}
                </span>
              </td>

              <td>

                <button
                  class="small"
                  onclick="setStatus(
                    ${client.id},
                    'active'
                  )"
                >
                  Activate
                </button>

                <button
                  class="small danger"
                  onclick="setStatus(
                    ${client.id},
                    'suspended'
                  )"
                >
                  Suspend
                </button>

              </td>

            </tr>
          `).join("")}

        </table>

      </section>

      <section class="card">

        <small>
          WORKFLOW REVIEW
        </small>

        <h2>Requests</h2>

        <table>

          <tr>
            <th>Client</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>

          ${data.requests.map(request => `
            <tr>

              <td>
                <b>
                  ${escapeHTML(
                    request.name
                  )}
                </b>

                <small>
                  ${escapeHTML(
                    request.email
                  )}
                </small>
              </td>

              <td>
                ${escapeHTML(
                  request.type
                )}
              </td>

              <td>
                ${money(
                  request.amount
                )}
              </td>

              <td>
                <span class="status ${request.status}">
                  ${escapeHTML(
                    request.status
                  )}
                </span>
              </td>

              <td>

                ${
                  request.status === "pending"
                  ?
                  `
                  <button
                    class="small"
                    onclick="requestStatus(
                      ${request.id},
                      'approved'
                    )"
                  >
                    Approve
                  </button>

                  <button
                    class="small danger"
                    onclick="requestStatus(
                      ${request.id},
                      'rejected'
                    )"
                  >
                    Reject
                  </button>
                  `
                  :
                  "Done"
                }

              </td>

            </tr>
          `).join("")}

        </table>

        <p class="note">
          All actions affect fictional
          prototype records only.
        </p>

      </section>
      `
    );

  } catch {
    login();
  }
}

async function setStatus(id, status) {
  await api(
    `/api/manager/user/${id}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status })
    }
  );

  managerDashboard();
}

async function requestStatus(id, status) {
  await api(
    `/api/manager/request/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ status })
    }
  );

  managerDashboard();
}

home();