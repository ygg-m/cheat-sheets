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
});
