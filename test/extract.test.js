"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const tools =
  require("../api/extract.js")
    ._test;


test(
  "clamp preserves short strings",
  () => {

    assert.equal(
      tools.clamp(
        "abc",
        5
      ),
      "abc"
    );

  }
);


test(
  "clamp truncates long strings",
  () => {

    assert.equal(
      tools.clamp(
        "abcdef",
        3
      ),
      "abc\n[...truncated...]"
    );

  }
);


test(
  "validateBody rejects invalid requests",
  () => {

    assert.equal(
      tools.validateBody(
        null
      ),
      false
    );


    assert.equal(
      tools.validateBody(
        []
      ),
      false
    );


    assert.equal(
      tools.validateBody({
        intake:"bad"
      }),
      false
    );


    assert.equal(
      tools.validateBody({
        currentReportText:5
      }),
      false
    );


    assert.equal(
      tools.validateBody({
        currentReportText:"ok",
        intake:{}
      }),
      true
    );

  }
);


test(
  "MIME allowlist rejects dangerous files",
  () => {

    assert.equal(
      tools.ALLOWED_MIME_TYPES
        .has(
          "application/pdf"
        ),
      true
    );


    assert.equal(
      tools.ALLOWED_MIME_TYPES
        .has(
          "image/png"
        ),
      true
    );


    assert.equal(
      tools.ALLOWED_MIME_TYPES
        .has(
          "text/html"
        ),
      false
    );


    assert.equal(
      tools.ALLOWED_MIME_TYPES
        .has(
          "application/javascript"
        ),
      false
    );

  }
);


test(
  "report input limit is 20000 characters",
  () => {

    assert.equal(
      tools.MAX_REPORT_TEXT_CHARS,
      20000
    );

  }
);
