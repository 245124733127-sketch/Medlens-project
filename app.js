"use strict";

const $ = id => document.getElementById(id);

let state = null;

const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c])
  );
}

function read(file) {
  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () =>
      resolve(reader.result);

    reader.onerror = () =>
      reject(
        new Error("Could not read the selected file.")
      );

    reader.readAsDataURL(file);
  });
}

async function prepareFile(file) {

  const mime =
    (file.type || "").toLowerCase();

  if (!ALLOWED.has(mime)) {
    throw new Error(
      "Unsupported file type. Use PDF, JPEG, PNG, WEBP or HEIC."
    );
  }

  if (!mime.startsWith("image/")) {

    if (file.size > 4000000) {
      throw new Error(
        "PDF is too large. Use a smaller PDF or paste the report text."
      );
    }

    const data =
      await read(file);

    return {
      mimeType: mime,
      data: data.split(",")[1]
    };
  }

  const url =
    await read(file);

  if (file.size <= 900000) {
    return {
      mimeType: mime,
      data: url.split(",")[1]
    };
  }

  const image =
    await new Promise((resolve, reject) => {

      const img =
        new Image();

      img.onload =
        () => resolve(img);

      img.onerror =
        () => reject(
          new Error("Could not decode image.")
        );

      img.src = url;
    });

  let {
    width,
    height
  } = image;

  const maxDimension =
    Math.max(width, height);

  if (maxDimension > 1800) {

    const scale =
      1800 / maxDimension;

    width =
      Math.round(width * scale);

    height =
      Math.round(height * scale);
  }

  const canvas =
    document.createElement("canvas");

  canvas.width =
    width;

  canvas.height =
    height;

  const context =
    canvas.getContext(
      "2d",
      { alpha:false }
    );

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const compressed =
    canvas.toDataURL(
      "image/jpeg",
      0.82
    );

  return {
    mimeType:"image/jpeg",
    data:compressed.split(",")[1]
  };
}


function tag(source) {

  if (source === "user") {

    return `
      <span class="tag user">
        USER
      </span>
    `;
  }

  if (source === "ai_insight") {

    return `
      <span class="tag insight">
        AI INSIGHT
      </span>
    `;
  }

  return `
    <span class="tag extract">
      AI EXTRACTED
    </span>
  `;
}


function statusClass(value) {

  if (!value)
    return "";

  if (value.includes("below"))
    return "below";

  if (value.includes("above"))
    return "above";

  if (value.includes("within"))
    return "within";

  return "";
}


function confidence(value) {

  const number =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) || 0
      )
    );

  return `
    <span class="confidence">
      ${number}%
    </span>

    <div
      class="bar"
      role="progressbar"
      aria-label="Extraction confidence ${number}%"
      aria-valuenow="${number}"
      aria-valuemin="0"
      aria-valuemax="100">

      <i style="width:${number}%"></i>

    </div>
  `;
}


function renderList(title, items) {

  if (!items?.length) {

    return `
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">
        Not provided
      </p>
    `;
  }

  return `
    <h3>${escapeHtml(title)}</h3>

    ${items.map(item => `
      <p>
        • ${escapeHtml(item.text)}
        ${tag(item.source)}
      </p>
    `).join("")}
  `;
}


function render() {

  const s = state;

  const patient =
    s.patientInfo || {};

  let html = "";


  html += `
  <section class="card">

    <h2>
      AI Safety & Quality Checks
      <span class="tag safe">
        PROTECTED
      </span>
    </h2>

    <div class="checks">

      <div class="check">
        ✓ Reference ranges are not invented
      </div>

      <div class="check">
        ✓ Patient data separated from report data
      </div>

      <div class="check">
        ✓ Contradictions are flagged
      </div>

      <div class="check">
        ✓ No diagnosis or treatment recommendations
      </div>

      <div class="check">
        ✓ Evidence shown for extracted values
      </div>

      <div class="check">
        ✓ Human verification available
      </div>

    </div>

  </section>
  `;


  html += `
  <section class="card">

    <h2>
      Structured Patient Record
    </h2>

    <p>
      <b>Name:</b>
      ${escapeHtml(
        patient.name ||
        $("name").value ||
        "Not provided"
      )}
      ${tag("user")}
    </p>

    <p>
      <b>Age:</b>
      ${escapeHtml(
        patient.age ||
        $("age").value ||
        "Not provided"
      )}
      ${tag("user")}
    </p>

    <p>
      <b>Sex:</b>
      ${escapeHtml(
        patient.sex ||
        $("sex").value ||
        "Not provided"
      )}
      ${tag("user")}
    </p>

    ${renderList(
      "Symptoms / Concerns",
      s.symptoms
    )}

    ${renderList(
      "Conditions & History",
      s.conditions
    )}

    ${renderList(
      "Allergies",
      s.allergies
    )}

    ${renderList(
      "Medications",
      s.medications
    )}

    ${renderList(
      "Additional Notes",
      s.notes
    )}

  </section>
  `;


  html += `
  <section class="card">

    <h2>
      Laboratory Results
      ${tag("current_report")}
    </h2>
  `;


  if (!s.labResults?.length) {

    html += `
      <p class="muted">
        No lab parameters extracted.
      </p>
    `;

  } else {

    html += `
    <div class="tablewrap">

      <table>

        <caption class="sr-only">
          Extracted laboratory results
        </caption>

        <thead>

          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Reference</th>
            <th>Status</th>
            <th>Confidence</th>
          </tr>

        </thead>

        <tbody>
    `;


    for (const result of s.labResults) {

      html += `
        <tr>

          <td>

            <b>
              ${escapeHtml(
                result.normalizedName ||
                result.parameter
              )}
            </b>

            <br>

            <span class="muted">
              ${escapeHtml(
                result.parameter
              )}
            </span>

            ${
              result.evidence
              ?
              `
              <div class="evidence">
                Evidence:
                ${escapeHtml(
                  result.evidence
                )}
              </div>
              `
              :
              ""
            }

          </td>


          <td>
            ${escapeHtml(result.value)}
            ${escapeHtml(result.unit)}
          </td>


          <td>
            ${
              escapeHtml(
                result.referenceRange
              ) ||
              "Not provided"
            }
          </td>


          <td
            class="status ${statusClass(
              result.status
            )}">

            ${escapeHtml(
              result.status
            )}

          </td>


          <td>
            ${confidence(
              result.confidence
            )}
          </td>

        </tr>
      `;
    }


    html += `
        </tbody>
      </table>

    </div>
    `;
  }


  html += `
  </section>
  `;


  if (s.comparison?.length) {

    html += `
    <section class="card">

      <h2>
        Longitudinal Comparison
        ${tag("ai_insight")}
      </h2>

      <div class="tablewrap">

      <table>

        <thead>
          <tr>
            <th>Parameter</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Change</th>
          </tr>
        </thead>

        <tbody>

          ${s.comparison.map(c => {

            let arrow = "→";

            if (c.direction === "up")
              arrow = "↑";

            if (c.direction === "down")
              arrow = "↓";

            if (c.direction === "new")
              arrow = "★";

            return `
              <tr>

                <td>
                  ${escapeHtml(
                    c.parameter
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    c.previousValue
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    c.currentValue
                  )}
                </td>

                <td>
                  ${arrow}
                  ${escapeHtml(
                    c.change
                  )}
                </td>

              </tr>
            `;

          }).join("")}

        </tbody>

      </table>

      </div>

    </section>
    `;
  }


  html += `
  <section class="card">

    <h2>
      Potential Conflicts
      ${tag("ai_insight")}
    </h2>
  `;


  if (!s.conflicts?.length) {

    html += `
      <p class="muted">
        No conflicts detected.
      </p>
    `;

  } else {

    for (const conflict of s.conflicts) {

      html += `
        <div class="alert">

          <b>
            ${escapeHtml(
              conflict.field
            )}
          </b>

          :

          ${escapeHtml(
            conflict.description
          )}

          <br>

          <span class="muted">

            User:
            ${escapeHtml(
              conflict.userProvided
            )}

            ·

            Report:
            ${escapeHtml(
              conflict.reportProvided
            )}

          </span>

        </div>
      `;
    }
  }


  html += `
  </section>
  `;


  html += `
  <section class="card">

    <h2>
      Clarification Questions
      ${tag("ai_insight")}
    </h2>

    ${
      s.clarificationQuestions?.length
      ?
      s.clarificationQuestions
        .map(question => `
          <p>
            ❓
            ${escapeHtml(question)}
          </p>
        `)
        .join("")
      :
      `
        <p class="muted">
          No clarification questions generated.
        </p>
      `
    }

  </section>
  `;


  html += `
  <section class="card">

    <h2>
      AI-Generated Summary
      ${tag("ai_insight")}
    </h2>

    <div class="summary">

      ${escapeHtml(
        s.summary ||
        "No summary generated."
      )}

    </div>

    <p class="muted">
      Organizational summary only;
      not diagnosis or treatment advice.
    </p>

  </section>
  `;


  $("results").innerHTML =
    html;
}


async function analyze() {

  const button =
    $("analyze");

  button.disabled =
    true;

  button.textContent =
    "Analyzing…";


  $("results").innerHTML = `
    <section
      class="card"
      role="status">

      Reading, validating and
      structuring the report…

    </section>
  `;


  try {

    const currentText =
      $("currentText")
      .value
      .trim();

    const previousText =
      $("previousText")
      .value
      .trim();

    const currentFile =
      $("currentFile")
      .files[0];

    const previousFile =
      $("previousFile")
      .files[0];


    if (!currentText && !currentFile) {

      throw new Error(
        "Provide a current report as text or upload a file."
      );
    }


    const body = {

      intake: {

        name:
          $("name").value.trim(),

        age:
          $("age").value.trim(),

        sex:
          $("sex").value,

        symptoms:
          $("symptoms").value.trim(),

        conditions:
          $("conditions").value.trim(),

        allergies:
          $("allergies").value.trim(),

        medications:
          $("medications").value.trim(),

        notes:
          $("notes").value.trim()

      },

      currentReportText:
        currentText,

      previousReportText:
        previousText
    };


    if (currentFile) {

      body.currentReportFile =
        await prepareFile(
          currentFile
        );
    }


    if (previousFile) {

      body.previousReportFile =
        await prepareFile(
          previousFile
        );
    }


    const response =
      await fetch(
        "/api/extract",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    const data =
      await response
        .json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        data.error ||
        "AI service error."
      );
    }


    state =
      data;

    render();


    $("results").focus({
      preventScroll:true
    });


  } catch (error) {

    $("results").innerHTML = `
      <section class="card">

        <div
          class="error"
          role="alert">

          ⚠️
          ${escapeHtml(
            error.message
          )}

        </div>

      </section>
    `;

  } finally {

    button.disabled =
      false;

    button.textContent =
      "Analyze with MedLens";
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("analyze")
      .addEventListener(
        "click",
        analyze
      );


    $("currentFile")
      .addEventListener(
        "change",
        event => {

          const file =
            event.currentTarget
              .files[0];

          $("currentFileName")
            .textContent =
            file
            ?
            `Selected: ${file.name}`
            :
            "";
        }
      );


    $("previousFile")
      .addEventListener(
        "change",
        event => {

          const file =
            event.currentTarget
              .files[0];

          $("previousFileName")
            .textContent =
            file
            ?
            `Selected: ${file.name}`
            :
            "";
        }
      );

  }
);
