export function renderProductPageDashboardHtml(): string {
  const sampleProduct = JSON.stringify(
    {
      sku: "ESP-001",
      title: "Portable Espresso Maker",
      description:
        "A compact manual espresso maker for travel and work.",
      price: 79,
      currency: "USD",
      cost: 31,
      inventory: 150,
      features: [
        "Portable",
        "No electricity required",
        "Easy to clean",
      ],
      benefits: [
        "Make espresso anywhere",
        "Reduce cafe spending",
      ],
      audiences: ["Travelers", "Office workers", "Campers"],
      imageUrls: ["https://example.invalid/espresso-1.jpg"],
      offer: { type: "percentage", value: 20 },
      channels: { shopify: true, amazon: true },
    },
    null,
    2,
  );

  const sampleSpecifications = JSON.stringify(
    [
      {
        field: "Capacity",
        value: "500 ml",
        sourceId: "supplier-page",
        critical: true,
      },
      {
        field: "Capacity",
        value: "500ml",
        sourceId: "manual-confirmation",
        critical: true,
      },
      {
        field: "Power",
        value: "Manual",
        sourceId: "supplier-page",
        critical: true,
      },
    ],
    null,
    2,
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Product Page Workspace · Ecom Growth Autopilot</title>
<style>
:root{
  --bg:#0c0e12;
  --panel:#151820;
  --panel2:#1b1f29;
  --text:#f5f7fb;
  --muted:#9aa3b5;
  --line:#2a3040;
  --accent:#8ce99a;
  --warn:#ffd43b;
  --bad:#ff8787
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:Inter,system-ui,sans-serif
}
.wrap{max-width:1400px;margin:auto;padding:28px}
.header{
  display:flex;
  justify-content:space-between;
  gap:20px;
  align-items:flex-start;
  margin-bottom:22px
}
h1{margin:0 0 8px;font-size:32px}
h2{margin-top:0}
p{line-height:1.5}
a{color:#9ed8ff}
.muted{color:var(--muted)}
.grid{
  display:grid;
  grid-template-columns:minmax(360px,460px) 1fr;
  gap:18px
}
.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:18px;
  padding:18px;
  margin-bottom:14px
}
input,textarea{
  width:100%;
  background:#0f1218;
  color:var(--text);
  border:1px solid var(--line);
  border-radius:10px;
  padding:11px
}
textarea{
  min-height:210px;
  font:12px/1.45 Consolas,monospace
}
button{
  border:0;
  border-radius:10px;
  padding:11px 14px;
  font-weight:800;
  cursor:pointer
}
button:disabled{opacity:.45;cursor:not-allowed}
.primary{background:var(--accent);color:#071108}
.secondary{
  background:#252b38;
  color:var(--text);
  border:1px solid var(--line)
}
.actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:10px
}
.badge{
  display:inline-block;
  border:1px solid var(--line);
  border-radius:999px;
  padding:6px 9px;
  margin:3px;
  font-size:12px
}
pre{
  white-space:pre-wrap;
  word-break:break-word;
  background:#0f1218;
  border:1px solid var(--line);
  border-radius:12px;
  padding:14px;
  max-height:700px;
  overflow:auto
}
.ok{color:var(--accent)}
.warn{color:var(--warn)}
.bad{color:var(--bad)}
@media(max-width:900px){
  .grid{grid-template-columns:1fr}
  .header{display:block}
}
</style>
</head>

<body>
<div class="wrap">
  <div class="header">
    <div>
      <h1>Product Page Workspace</h1>
      <p class="muted">
        Supplier URL → evidence → verification → Product Brain →
        page brief → Shopify/GemPages drafts → QA → human approval.
      </p>
    </div>

    <div>
      <a href="/dashboard">← Campaign dashboard</a><br>
      <span class="badge">External writes disabled</span>
      <span class="badge">Live publishing disabled</span>
      <span class="badge">Human approval required</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="card">
        <h2>1. Supplier intake</h2>

        <input
          id="supplierUrl"
          value="https://www.aliexpress.com/item/100500123456.html"
        >

        <div class="actions">
          <button class="primary" id="createJob">
            Create research job
          </button>
        </div>

        <p id="jobState" class="muted">
          No product-page job created yet.
        </p>
      </div>

      <div class="card">
        <h2>2. Product</h2>
        <textarea id="productInput">${sampleProduct}</textarea>
      </div>

      <div class="card">
        <h2>3. Specification evidence</h2>

        <textarea id="specInput">${sampleSpecifications}</textarea>

        <div class="actions">
          <button class="secondary" id="verifySpecs">
            Verify specifications
          </button>

          <button class="primary" id="buildPage">
            Build product page
          </button>
        </div>
      </div>

      <div class="card">
        <h2>4. Human approval</h2>

        <p class="muted">
          Approval is local only. It does not publish to Shopify or GemPages.
        </p>

        <div class="actions">
          <button class="secondary" id="approvePage">
            Approve local draft
          </button>
        </div>
      </div>
    </div>

    <div>
      <div class="card">
        <h2>Workflow result</h2>
        <div id="summary" class="muted">
          Create a supplier job to begin.
        </div>
        <pre id="output">{}</pre>
      </div>
    </div>
  </div>
</div>

<script>
let jobId = null;

const output = document.getElementById("output");
const summary = document.getElementById("summary");
const jobState = document.getElementById("jobState");

function show(value) {
  output.textContent = JSON.stringify(value, null, 2);

  const job = value.job || value;

  if (job && job.status && job.safety) {
    jobState.textContent =
      "Job " + job.jobId + " · " + job.status;

    summary.innerHTML =
      "<strong>Status:</strong> " + job.status +
      " · <strong>External writes:</strong> " +
      job.safety.externalWrites +
      " · <strong>Live publishing:</strong> " +
      job.safety.livePublishing;
  }
}

async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();

  show(body);

  if (!response.ok) {
    throw new Error(
      body.message ||
      body.error ||
      "Request failed"
    );
  }

  return body;
}

document.getElementById("createJob").onclick = async () => {
  try {
    const body = await request("/product-page/jobs", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        supplierUrl:
          document.getElementById("supplierUrl").value
      })
    });

    jobId = body.job.jobId;
  } catch (error) {
    summary.textContent = error.message;
  }
};

document.getElementById("verifySpecs").onclick = async () => {
  if (!jobId) {
    summary.textContent = "Create a supplier job first.";
    return;
  }

  try {
    await request("/product-page/evidence", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        jobId,
        specifications:
          JSON.parse(document.getElementById("specInput").value)
      })
    });
  } catch (error) {
    summary.textContent = error.message;
  }
};

document.getElementById("buildPage").onclick = async () => {
  if (!jobId) {
    summary.textContent = "Create a supplier job first.";
    return;
  }

  try {
    await request("/product-page/brief", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        jobId,
        product:
          JSON.parse(document.getElementById("productInput").value),
        specifications:
          JSON.parse(document.getElementById("specInput").value)
      })
    });
  } catch (error) {
    summary.textContent = error.message;
  }
};

document.getElementById("approvePage").onclick = async () => {
  if (!jobId) {
    summary.textContent =
      "Create and build a product page first.";
    return;
  }

  try {
    await request("/product-page/approval", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({
        jobId,
        status: "APPROVED",
        note: "Approved from local Product Page Workspace"
      })
    });
  } catch (error) {
    summary.textContent = error.message;
  }
};
</script>
</body>
</html>`;
}
