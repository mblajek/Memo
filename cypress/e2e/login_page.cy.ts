import {disableTranslations} from "../util";

context("Login page", () => {
  beforeEach(() => {
    cy.visit("/");
    disableTranslations();
  });

  function enterCred(email: string, password: string | undefined) {
    cy.get("input[name=email]").clear().type(email);
    const pwd = cy.get("input[name=password]");
    pwd.clear();
    if (password) {
      pwd.type(password);
    }
    cy.get("button[type=submit]").click();
  }

  it("handles bad credentials", () => {
    cy.visit("/login");
    enterCred("invalid email", undefined);
    cy.get("button[type=submit]").should("be.disabled");
    cy.get("button[type=submit]").should("be.enabled");
    cy.contains("exception.validation");
    cy.contains("validation.email");
    cy.contains("validation.required");
    enterCred("valid@email.x", "badpass");
    cy.get("button[type=submit]").should("be.disabled");
    cy.get("button[type=submit]").should("be.enabled");
    cy.contains("exception.bad_credentials");
    cy.url().should("contain", "/login");
  });
});
