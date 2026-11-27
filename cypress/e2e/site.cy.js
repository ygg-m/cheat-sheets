const sheets = ["git", "javascript", "python", "cypress", "selenium"];
const label = (s) => s.charAt(0).toUpperCase() + s.slice(1);

describe("Cheat Sheets site", () => {
  describe("index page", () => {
    beforeEach(() => cy.visit("/"));

    it("shows the index with a link for every sheet", () => {
      cy.title().should("eq", "Cheat Sheets");
      cy.get("ul.index li").should("have.length", sheets.length);
      sheets.forEach((s) => {
        cy.get("ul.index").contains("a", label(s)).should("have.attr", "href", `#${s}`);
      });
    });

    it("shows a nav link for every sheet, none active", () => {
      cy.get("#nav a").should("have.length", sheets.length);
      cy.get("#nav a.active").should("not.exist");
    });

    it("falls back to the index for an unknown hash", () => {
      cy.visit("/#does-not-exist");
      cy.get("ul.index").should("be.visible");
    });
  });

  describe("sheet pages", () => {
    sheets.forEach((s) => {
      it(`renders ${s}.md as HTML`, () => {
        cy.visit(`/#${s}`);
        cy.get("#content h1").should("exist").and("not.be.empty");
        cy.get("#content").should("not.contain.text", "Loading");
        cy.get("#content .error").should("not.exist");
        cy.title().should("eq", `${label(s)} – Cheat Sheets`);
        cy.get(`#nav a[data-s="${s}"]`).should("have.class", "active");
      });
    });

    it("renders markdown, not raw syntax", () => {
      cy.visit("/#git");
      cy.get("#content pre code").should("exist");
      // Check prose only: "# ..." is legitimate inside code blocks (shell comments).
      cy.get("#content p, #content li, #content td").each(($el) => {
        const text = $el.text();
        expect(text).not.to.match(/^#{1,6} /);
        expect(text).not.to.contain("```");
        expect(text).not.to.contain("**");
      });
    });

    it("applies syntax highlighting to code blocks", () => {
      cy.visit("/#python");
      cy.get("#content pre code.hljs").should("exist");
    });
  });

  describe("navigation", () => {
    it("navigates between sheets via the nav bar", () => {
      cy.visit("/");
      cy.get('#nav a[data-s="python"]').click();
      cy.location("hash").should("eq", "#python");
      cy.get('#nav a[data-s="python"]').should("have.class", "active");

      cy.get('#nav a[data-s="git"]').click();
      cy.location("hash").should("eq", "#git");
      cy.get('#nav a[data-s="git"]').should("have.class", "active");
      cy.get('#nav a[data-s="python"]').should("not.have.class", "active");
    });

    it("navigates from the index list to a sheet", () => {
      cy.visit("/");
      cy.get("ul.index").contains("a", "Selenium").click();
      cy.location("hash").should("eq", "#selenium");
      cy.get("#content h1").should("exist");
    });

    it("returns to the index via the site title", () => {
      cy.visit("/#git");
      cy.get("header h1 a").click();
      cy.get("ul.index").should("be.visible");
      cy.get("#nav a.active").should("not.exist");
    });

    it("supports the browser back button", () => {
      cy.visit("/");
      cy.get('#nav a[data-s="git"]').click();
      cy.get('#nav a[data-s="javascript"]').click();
      cy.go("back");
      cy.location("hash").should("eq", "#git");
      cy.get('#nav a[data-s="git"]').should("have.class", "active");
    });
  });

  describe("links", () => {
    it("header and nav links all point to a real route", () => {
      cy.visit("/");
      cy.get("header a").each(($a) => {
        const href = $a.attr("href");
        expect(href).to.match(/^#(settings|git|javascript|python|cypress|selenium)?$/);
      });
    });

    sheets.forEach((s) => {
      it(`${s}: every in-page markdown link scrolls to its heading and stays on the sheet`, () => {
        cy.visit(`/#${s}`);
        cy.get("#content h1").should("exist");
        cy.get("#content a[href^='#']").then(($links) => {
          cy.wrap($links).each(($a) => {
            const id = decodeURIComponent($a.attr("href").slice(1));
            cy.get("#content").then(($c) => {
              expect($c.find(`[id="${id}"]`).length, `heading for #${id}`).to.eq(1);
            });
            cy.wrap($a).click();
            cy.location("hash").should("eq", `#${s}`);
            cy.get("#content .error").should("not.exist");
            cy.get(`[id="${id}"]`).should("be.visible");
          });
        });
      });

      it(`${s}: external links are well-formed and reachable`, () => {
        cy.visit(`/#${s}`);
        cy.get("#content h1").should("exist");
        cy.get("#content").then(($c) => {
          const $links = $c.find("a[href]:not([href^='#'])");
          const urls = [...new Set([...$links].map((a) => a.href))];
          urls.forEach((url) => {
            expect(url, "protocol").to.match(/^https?:\/\//);
            cy.request({ url, failOnStatusCode: false, timeout: 20000 }).then(({ status }) => {
              // 401/403/429 = the site is up but blocks automated clients; only real breakage fails.
              const ok = status < 400 || [401, 403, 429].includes(status);
              expect(ok, `${url} responded ${status}`).to.eq(true);
            });
          });
        });
      });
    });

    it("clicking a table-of-contents link does not go home", () => {
      cy.visit("/#selenium");
      cy.get("#content a[href='#2-browser-control']").click();
      cy.get("ul.index").should("not.exist");
      cy.get("#content h2").contains("Browser control").should("be.visible");
    });
  });

  describe("error handling", () => {
    it("shows an error message when a sheet fails to load", () => {
      cy.intercept("GET", "/git.md", { statusCode: 404 }).as("sheet");
      cy.visit("/#git");
      cy.wait("@sheet");
      cy.get("#content .error").should("contain.text", "Could not load git.md");
    });
  });

  describe("responsive layout", () => {
    it("has no horizontal scroll on a phone viewport", () => {
      cy.viewport("iphone-x");
      sheets.forEach((s) => {
        cy.visit(`/#${s}`);
        cy.get("#content h1").should("exist");
        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
        });
      });
    });
  });
  describe("settings page", () => {
    beforeEach(() => cy.visit("/#settings"));

    it("renders and highlights the settings link", () => {
      cy.get("#content h1").should("have.text", "Settings");
      cy.get("#settings-link").should("have.class", "active");
      cy.title().should("eq", "Settings – Cheat Sheets");
    });

    it("applies and persists a theme", () => {
      cy.get('[data-theme-id="nord"]').click();
      cy.get("html").should("have.attr", "data-theme", "nord");
      cy.reload();
      cy.get("html").should("have.attr", "data-theme", "nord");
    });

    it("changes font size and resets to defaults", () => {
      cy.get("#fontSize").invoke("val", 22).trigger("input");
      cy.get("html").should("have.css", "font-size", "22px");
      cy.get("#reset").click();
      cy.get("html").should("have.css", "font-size", "16px");
    });
  });
});
