import {disableTranslations, logIn, testingUsers} from "../util";

context("User options", () => {
  it("logs in", () => {
    logIn(testingUsers.globalAdmin);
    cy.visit("/");
    disableTranslations();
    cy.contains("TestingUser GlobalAdmin");
    cy.get("[aria-description='verified_user'] svg");
  });

  context("password change form", () => {
    it("validates", () => {
      logIn(testingUsers.globalAdmin);
      cy.visit("/");
      disableTranslations();
      cy.get("[aria-description='user_settings']").click();
      cy.contains("actions.change_password").click();

      cy.get("button[type=submit]").click();
      cy.get("input[name=current]").parent().siblings().contains("validation.required");
      cy.get("input[name=password]").parent().siblings().contains("validation.required");
      cy.get("input[name=repeat]").parent().siblings().contains("validation.required");

      cy.get("input[name=current]").clear().type("badpass");
      cy.get("input[name=password]").clear().type("simple");
      cy.get("input[name=repeat]").clear().type("other");
      cy.get("button[type=submit]").click();
      cy.contains("exception.validation");
      cy.get("input[name=current]").parent().siblings().contains("validation.current_password");
      cy.get("input[name=password]").parent().siblings().contains("validation.password.all_rules");
      cy.get("input[name=repeat]").parent().siblings().contains("validation.same");

      cy.get("input[name=current]").clear().type(testingUsers.globalAdmin.password);
      cy.get("input[name=password]").clear().type(testingUsers.globalAdmin.password);
      cy.get("input[name=repeat]").clear().type(testingUsers.globalAdmin.password);
      cy.get("button[type=submit]").click();
      cy.contains("exception.validation");
      cy.get("input[name=password]").parent().siblings().contains("validation.different");
    });

    it("works", () => {
      const ALT_PASSWORD = "AltPassw0rt!";
      logIn(testingUsers.globalAdmin);
      cy.visit("/");
      disableTranslations();
      cy.get("[aria-description='user_settings']").click();
      cy.contains("actions.change_password").click();
      cy.get("input[name=current]").clear().type(testingUsers.globalAdmin.password);
      cy.get("input[name=password]").clear().type(ALT_PASSWORD);
      cy.get("input[name=repeat]").clear().type(ALT_PASSWORD);
      cy.get("button[type=submit]").click();
      cy.contains("forms.password_change.success");

      cy.get("[aria-description='user_settings']").click();
      cy.contains("actions.log_out").click();
      cy.url().should("contain", "/login");
      logIn({...testingUsers.globalAdmin, password: ALT_PASSWORD});
      cy.visit("/");
      disableTranslations();
      cy.get("[aria-description='user_settings']").click();
      cy.contains("actions.change_password").click();
      cy.get("input[name=current]").clear().type(ALT_PASSWORD);
      cy.get("input[name=password]").clear().type(testingUsers.globalAdmin.password);
      cy.get("input[name=repeat]").clear().type(testingUsers.globalAdmin.password);
      cy.get("button[type=submit]").click();
      cy.contains("forms.password_change.success");
    });
  });

  it("logs out", () => {
    logIn(testingUsers.globalAdmin);
    cy.visit("/");
    disableTranslations();
    cy.get("[aria-description='user_settings']").click();
    cy.contains("actions.log_out").click();
    cy.url().should("contain", "/login");
    cy.request({url: "/api/v1/user/status", failOnStatusCode: false}).its("status").should("eq", 401);
  });
});
