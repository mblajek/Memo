import testingUsersJson from "./testing_users.json";

export const testingUsers = testingUsersJson;

interface TestingUserData {
  readonly email: string;
  readonly password: string;
}

export function logIn(testingUserData: TestingUserData) {
  cy.session(
    [testingUserData.email, testingUserData.password],
    () => {
      cy.visit("/login");
      cy.get("#email").type(testingUserData.email);
      cy.get("#password").type(testingUserData.password);
      cy.get("button[type=submit]").click();
      cy.url().should("not.contain", "/login");
    },
    {
      validate: () => {
        cy.request("/api/v1/user/status").its("status").should("eq", 200);
      },
    },
  );
}

export function disableTranslations() {
  cy.window().then((w) => {
    w.sessionStorage.setItem("language", "testing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w as any).i18next?.changeLanguage("testing");
  });
  cy.contains("app_version");
}
