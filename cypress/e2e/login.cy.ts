import {disableTranslations, logIn, testingUsers} from "../util";

context("Login", () => {
  it("logs in", () => {
    logIn(testingUsers.globalAdmin);
    cy.visit("/");
    disableTranslations();
    cy.contains("TestingUser GlobalAdmin");
    cy.get("[aria-description='verified_user']");
  });
});
