import * as fs from "https://deno.land/std@0.190.0/fs/mod.ts";
import {parseArgs} from "https://deno.land/std@0.220.1/cli/parse_args.ts";
import * as csv from "https://deno.land/std@0.220.1/csv/mod.ts";
import {Attendant, Client, FacilityContents, GiveStaff, Meeting, Staff} from "../facility_contents_type.ts";
import {attributes, dictionaries, extendDictionaries} from "./dicts_and_attribs.ts";

const params = parseArgs(Deno.args, {
  string: ["exports-dir", "static-data-dir", "out"],
});

function getParam<N extends keyof typeof params>({
  name,
  desc,
  check,
}: {
  name: N;
  desc: string;
  check?: (value: NonNullable<(typeof params)[N]>) => boolean;
}) {
  const value = params[name];
  if (value == undefined || (check && !check(value))) {
    console.error(`Provide ${desc} as --${name}`);
    Deno.exit(1);
  }
  return value;
}

const exportsDir = getParam({
  name: "exports-dir",
  desc: "path to directory with data exported from salesforce",
  check: fs.existsSync,
});
const staticDataDir = getParam({
  name: "static-data-dir",
  desc: "path to directory with static data",
  check: fs.existsSync,
});
const outPath = getParam({name: "out", desc: "path to output file"});

type FieldsType<T extends string[]> = T[number];

// prettier-ignore
interface FilesType {
  Account: FieldsType<["AccountNumber","AccountSource","AnnualRevenue","BillingCity","BillingCountry","BillingGeocodeAccuracy","BillingLatitude","BillingLongitude","BillingPostalCode","BillingState","BillingStreet","Case_External_Id__c","ChannelProgramLevelName","ChannelProgramName","CreatedById","CreatedDate","CSR__c","Description","District__c","Email_Biuro__c","Etap_Wsp_pracy__c","Family_External_Id__c","Fax","Firma_Odpada__c","Fundacja__c","Id","Industry","Industry_custom__c","IsDeleted","IsPartner","Jigsaw","JigsawCompanyId","Komentarz__c","LastActivityDate","LastModifiedById","LastModifiedDate","LastReferencedDate","LastViewedDate","MasterRecordId","Name","NumberOfEmployees","Obecnie_pracuj_na_Koncie__c","Opis_CSR__c","OwnerId","Ownership","ParentId","Phone","PhotoUrl","Products_Services__c","Rating","RecordTypeId","SFSSDupeCatcher__Override_DupeCatcher__c","ShippingCity","ShippingCountry","ShippingGeocodeAccuracy","ShippingLatitude","ShippingLongitude","ShippingPostalCode","ShippingState","ShippingStreet","Sic","SicDesc","Site","Starogard_municipalities__c","SystemModstamp","TickerSymbol","Type","Website"]>,
  Contact: FieldsType<["AccountId","Account_Number__c","Acknowledgment_File__c","Actual_age__c","Addictions__c","Address__c","Age_after_signing_DD__c","Age_at_the_time_of_notification__c","Amount_of_DD_Payments_Last_3M__c","Amount_of_Payments_2pre_previous_month__c","Amount_of_Payments_from_previous_month__c","Amount_of_Payments_from_this_month__c","Amount_of_Payments_last_12_months__c","Amount_of_Payments_pre_previous_month__c","Anniversary_Date__c","areContactAndAccountNamesEquals__c","AssistantName","AssistantPhone","Authorization_File__c","Authorization_MPR_File__c","Bank_Code__c","Bank_Name__c","Bank_Returns_File_MPR__c","Bank_Returns_File__c","Birthdate","Cancellation_Code__c","Cancellation_File_Old__c","Cancellation_File__c","Cause_of_Resignation__c","Chronic_somatic_diseases__c","Closed__c","CreatedById","CreatedDate","DD_Calendar_Week__c","DD_Calendar_Year__c","Department","Description","Direct_Debit_Amount__c","Direct_Debit_Deactivation_Reason__c","Direct_Debit_Donor_Status__c","Direct_Debit_End_Date__c","Direct_Debit_ID__c","Direct_Debit_Information__c","Direct_Debit_Signature_Date__c","Direct_Debit_Start_Date__c","Direct_Debit_Status__c","Direct_Debit_Suspended_Date__c","Direct_Debit_Trial_Date__c","Direct_Debit_Verification_Code__c","District__c","Domestic_violence__c","Donor_ID_with_zeros__c","Donor_ID__c","Donor_OK_File__c","Donor_OK__c","Donor_Owner__c","DoNotCall","Education__c","Email","EmailBouncedDate","EmailBouncedReason","Email_as_External_ID__c","Email_Salutation__c","End_date_of_membership__c","Export_to_bank_returns_file__c","Export_to_cancellation_file__c","Family_Member_External_Id__c","Family__c","Fax","Financial_situation__c","FirstName","First_DD_Payment_Date__c","First_Meeting_Date__c","First_PayU_Payment_Date__c","First_Single_Payment_Date__c","Fundraiser__c","Gender__c","HasOptedOutOfEmail","HasOptedOutOfFax","HomePhone","Id","Identification_Number__c","IndividualId","IsAddressComplete__c","IsDeleted","IsEmailBounced","isPayU__c","Jigsaw","JigsawContactId","Job_position__c","LastActivityDate","LastCURequestDate","LastCUUpdateDate","LastModifiedById","LastModifiedDate","LastName","LastReferencedDate","LastViewedDate","Last_DD_Payment_Date__c","Last_PayU_Payment_Date__c","Last_Single_Payment_Date__c","LeadSource","LongID__c","MailingCity","MailingCountry","MailingGeocodeAccuracy","MailingLatitude","MailingLongitude","MailingPostalCode","MailingState","MailingStreet","Marital_status__c","MasterRecordId","Mental_problems__c","MobilePhone","Name","Name_in_vocative__c","Name_Lastname__c","Newsletter__c","New_Debtor_File__c","New_Debtor_Response_File_Date__c","New_Debtor_Response_File__c","New_Donors_Report__c","New_Donor_File__c","Nie_chce_otrzymywa_materia_w__c","Nie_kontaktowa_si__c","Non_reponse_to_TM__c","Number_of_1_payments__c","Number_of_DD_Payments__c","Number_of_DotPay_Last_365_Days__c","Number_of_Payments_without_1__c","Number_of_Payments__c","Number_of_PayU_payments__c","Number_of_Runner_Payments__c","Number_of_Single_Last_365_Days__c","Number_of_single_payments__c","OtherCity","OtherCountry","OtherGeocodeAccuracy","OtherLatitude","OtherLongitude","OtherPhone","OtherPostalCode","OtherState","OtherStreet","OwnerId","Payment02__c","PayUActive__c","Penality__c","Phone","PhotoUrl","Podejrzany__c","Priority__c","PZ_Id__c","RecordTypeId","Recovery_Date__c","Recovery_File__c","Recovery__c","Regular_Payments_3M__c","Regular_Payments__c","ReportsToId","Salutation","Second_Name__c","Send_Anniversary_Email__c","Send_Birthday_Email__c","Sex__c","SFSSDupeCatcher__Override_DupeCatcher__c","Single_payments_file__c","Source_of_livelihood__c","Source__c","Starogard_municipalities__c","Start_date_of_membership__c","Status_1__c","Status_DM__c","Status_FDN_Club__c","Status_irregular_donor__c","Status_of_parent__c","Status_single_donor__c","Submitted_for_approval__c","Sub_Source__c","Sum_of_1__c","Sum_of_DD__c","Sum_of_Payments_last_24_months__c","Sum_of_payments_without_1__c","Sum_of_PayU_Payments__c","Sum_of_Runner_Payments__c","Sum_of_Single_Payments_last_365_days__c","Sum_of_Single_payments_this_year__c","Sum_of_single_without_DD_365__c","Sum_of_Single__c","Sum_of_Total_Payments__c","SystemModstamp","Tag__c","Test_Cancellation_File__c","Title","Top_Donor1__c","Top_Donor_End_Date__c","To_Deduplicate__c","To_verify__c","Transaction_MPR_OK_File__c","Transaction_OK_File__c","Trigger_Time_01__c","Type_of_Donor__c","Verification_Reason__c","Victim_of_domestic_violence__c","Welcome_Pack_sended__c","Workday__c","Zwrot1__c","Zwrot2__c","Zwrot3__c"]>,
  EventRelation: FieldsType<["CreatedById","CreatedDate","EventId","Id","IsDeleted","LastModifiedById","LastModifiedDate","RelationId","RespondedDate","Response","Status","SystemModstamp"]>,
  Survey_of_risk_factors__c: FieldsType<["Addictions_in_the_family__c","Adoptive_family__c","Aggression_against_a_child__c","Aggression_towards_adults__c","A_difficult_childbirth__c","Case__c","Children_from_different_compounds__c","Child_s_impaired_emotional_development__c","Child_s_impaired_psychomotor_development__c","Child_s_impaired_social_development__c","Child_s_scratches_injuries_bruises__c","Child_with_allergies__c","Chronic_illness_of_a_family_member__c","Chronic_illness_one_of_the_parents__c","Conflicts_in_the_family__c","CreatedById","CreatedDate","Curator_in_the_family__c","Difficult_financial_situation__c","Difficult_housing_situation__c","Disabled_child__c","Disturbing_relation_of_parent_and_child__c","Divorce_in_the_family__c","Families_with_many_children__c","Family_under_the_care_of_SWC__c","Favouring_one_of_the_children__c","Foster_family__c","High_need_child__c","Hyperactive_child__c","Id","Identified_mental_disorders__c","Inability_to_cope_with_child_s_behavior__c","Insulation_avoiding_contact__c","Intellectual_disability_of_parent__c","IsDeleted","Juvenile_parents__c","Lack_of_attention_to_hygiene_personal__c","Lack_of_knowledge_about_child_developmen__c","Lack_of_medical_care_child_immunization__c","Lack_of_medical_care_during_pregnancy__c","LastModifiedById","LastModifiedDate","Limited_contact_with_child__c","Lone_parenthood__c","Medical_neglect__c","Name","Neglecting_mental_needs_of_child__c","Neglecting_physical_needs_of_child__c","Not_ready_to_take_the_role_of_a_parent__c","Number_of_risk_factors__c","Otherness_culture_religo__c","Other_children_in_foster_care__c","Overprotection__c","Parents_too_overwhelmed_with_duties__c","Parent_s_penality__c","Partner_is_not_a_biol_parent_of_a_child__c","Police_intervention__c","Preliminary_survey__c","Sickly_child__c","SystemModstamp","The_experience_of_violence_in_childhood__c","Unemployment__c","Unwanted_child__c","Using_unconstructive_methods__c","Violence_against_children_in_the_family__c","Violence_between_adults_in_the_family__c","Who_is_affected_by_unemployment__c"]>,
  Case: FieldsType<["AccountId","Age_at_time_of_notification__c","Another_decision__c","Another_person_notifying__c","Another_person_notyfing_birthdate__c","Another_person_notyfing_sex__c","Another_referral_to_FDN__c","Another_relationship_to_the_child__c","AssetId","BusinessHoursId","Care_educational_facility__c","CaseNumber","Case_AutoNumber__c","Case_External_Id__c","Case_Number_Link__c","Case_Number__c","ClosedDate","Comments","ContactEmail","ContactFax","ContactId","ContactMobile","ContactPhone","Court__c","CreatedById","CreatedDate","Decision__c","Description","Description__c","Family_member__c","Friends__c","Health_care_facility__c","Id","Interdisciplinary_team__c","Intervention_notification_to_prosecution__c","Intervention_notification_to_the_court__c","IsClosed","IsClosedOnCreate","IsDeleted","IsEscalated","Kindergarten__c","Language","LastModifiedById","LastModifiedDate","LastReferencedDate","LastViewedDate","Leaflet__c","MasterRecordId","Name_of_the_person_notifying__c","Notification_date__c","Number_of_children__c","Nursery__c","OPS__c","Origin","Other_referral__c","Other_source__c","OwnerId","ParentId","Person_Notifying_Address__c","Person_Notifying_Phone__c","Person_notifying__c","Police__c","Poster__c","Press__c","Priority","Program__c","Prosecution__c","Psychological_pedagogical_clinic__c","Radio__c","Reason","RecordTypeId","Referral_to_FDN_by__c","Referral_to_FDN__c","Relationship_to_the_child__c","School__c","Second_contact_name__c","Second_contact_Relationship_to_child__c","Sex__c","SourceId","Source_of_information_about_the_offer__c","Starogard_municipalities__c","Status","Subject","SuppliedCompany","SuppliedEmail","SuppliedName","SuppliedPhone","SystemModstamp","TV__c","Type","Warsaw_district__c","Web_page__c"]>,
  Event: FieldsType<["AccountId","ActivityDate","ActivityDateTime","Case_External_Id__c","CreatedById","CreatedDate","Description","DurationInMinutes","EndDate","EndDateTime","EventSubtype","Event_External_Id__c","Event_start_date_for_SMS_reminder__c","Firma_Niezakwalifikowana__c","GroupEventType","Id","IsAllDayEvent","IsArchived","IsChild","IsDeleted","IsGroupEvent","IsPrivate","IsRecurrence","IsRecurrence2","IsRecurrence2Exception","IsRecurrence2Exclusion","IsReminderSet","IsVisibleInSelfService","LastModifiedById","LastModifiedDate","Location","Notes_of_lawyer__c","Notify_via_SMS_2_days_before_event__c","OwnerId","RecordTypeId","Recurrence2PatternStartDate","Recurrence2PatternText","Recurrence2PatternTimeZone","Recurrence2PatternVersion","RecurrenceActivityId","RecurrenceDayOfMonth","RecurrenceDayOfWeekMask","RecurrenceEndDateOnly","RecurrenceInstance","RecurrenceInterval","RecurrenceMonthOfYear","RecurrenceStartDateTime","RecurrenceTimeZoneSidKey","RecurrenceType","ReminderDateTime","ShowAs","SMS_gate_email__c","SMS_notification_sent__c","StartDateTime","Status_of_contact__c","Subject","SystemModstamp","Type","WhatId","WhoId"]>,
  Notification_reason__c: FieldsType<["Abuser__c","Another_notification_reason__c","Case__c","Chronic_or_sudden_illness__c","Concerns_about_child_s_development__c","CreatedById","CreatedDate","Death_in_the_family__c","Description__c","Disturbing_child_s_behavior__c","Divorce__c","early_parenthood__c","Emotional_coldness__c","Gender__c","Id","Impaired_relationship_with_a_child__c","Inability_to_cope_with_child_s_behavior__c","IsDeleted","Lack_of_consequence__c","Lack_of_interest_in_a_child__c","LastModifiedById","LastModifiedDate","Leave_child_unattended__c","Name","Notification_reason_detail__c","Notification_reason_link__c","Notification_reason__c","No_reaction_to_a_crying_child__c","Other_notification_reason__c","Problems_of_communication_with_child__c","Problems_of_coping_with_child_s_emotions__c","Problems_of_recognizing_child_s_needs__c","Problems_of_separation_with_a_child__c","Problems_of_setting_boundaries__c","Problem_of_coping_with_your_own_emotions__c","Reconstructed_family__c","RecordTypeId","Separation__c","Single_parenthood__c","SystemModstamp","Too_high_expectations_towards_a_child__c","Unplanned_pregnancy__c"]>,
  User: FieldsType<["AboutMe","AccountId","Alias","BadgeText","BannerPhotoUrl","CallCenterId","City","CommunityNickname","CompanyName","ContactId","Country","CreatedById","CreatedDate","DefaultGroupNotificationFrequency","DelegatedApproverId","Department","DigestFrequency","Division","Email","EmailEncodingKey","EmailPreferencesAutoBcc","EmailPreferencesAutoBccStayInTouch","EmailPreferencesStayInTouchReminder","EmployeeNumber","Extension","Fax","FederationIdentifier","FirstName","ForecastEnabled","FullPhotoUrl","GeocodeAccuracy","Id","IndividualId","IsActive","IsExtIndicatorVisible","IsPortalEnabled","IsProfilePhotoActive","LanguageLocaleKey","LastLoginDate","LastModifiedById","LastModifiedDate","LastName","LastPasswordChangeDate","LastReferencedDate","LastViewedDate","Latitude","LocaleSidKey","Longitude","ManagerId","MediumBannerPhotoUrl","MediumPhotoUrl","MobilePhone","Name","NumberOfFailedLogins","OfflinePdaTrialExpirationDate","OfflineTrialExpirationDate","OutOfOfficeMessage","Phone","PortalRole","PostalCode","ProfileId","ReceivesAdminInfoEmails","ReceivesInfoEmails","SenderEmail","SenderName","Signature","SmallBannerPhotoUrl","SmallPhotoUrl","State","StayInTouchNote","StayInTouchSignature","StayInTouchSubject","Street","SystemModstamp","TimeZoneSidKey","Title","Username","UserPermissionsAvantgoUser","UserPermissionsCallCenterAutoLogin","UserPermissionsChatterAnswersUser","UserPermissionsInteractionUser","UserPermissionsMarketingUser","UserPermissionsOfflineUser","UserPermissionsSFContentUser","UserPermissionsSupportUser","UserPreferencesActivityRemindersPopup","UserPreferencesApexPagesDeveloperMode","UserPreferencesCacheDiagnostics","UserPreferencesContentEmailAsAndWhen","UserPreferencesContentNoEmail","UserPreferencesCreateLEXAppsWTShown","UserPreferencesDisableAllFeedsEmail","UserPreferencesDisableBookmarkEmail","UserPreferencesDisableChangeCommentEmail","UserPreferencesDisableEndorsementEmail","UserPreferencesDisableFileShareNotificationsForApi","UserPreferencesDisableFollowersEmail","UserPreferencesDisableLaterCommentEmail","UserPreferencesDisableLikeEmail","UserPreferencesDisableMentionsPostEmail","UserPreferencesDisableMessageEmail","UserPreferencesDisableProfilePostEmail","UserPreferencesDisableSharePostEmail","UserPreferencesDisCommentAfterLikeEmail","UserPreferencesDisMentionsCommentEmail","UserPreferencesDisProfPostCommentEmail","UserPreferencesEnableAutoSubForFeeds","UserPreferencesEventRemindersCheckboxDefault","UserPreferencesExcludeMailAppAttachments","UserPreferencesFavoritesShowTopFavorites","UserPreferencesFavoritesWTShown","UserPreferencesGlobalNavBarWTShown","UserPreferencesGlobalNavGridMenuWTShown","UserPreferencesHasCelebrationBadge","UserPreferencesHasSentWarningEmail","UserPreferencesHasSentWarningEmail238","UserPreferencesHasSentWarningEmail240","UserPreferencesHideBiggerPhotoCallout","UserPreferencesHideBrowseProductRedirectConfirmation","UserPreferencesHideChatterOnboardingSplash","UserPreferencesHideCSNDesktopTask","UserPreferencesHideCSNGetChatterMobileTask","UserPreferencesHideEndUserOnboardingAssistantModal","UserPreferencesHideLightningMigrationModal","UserPreferencesHideOnlineSalesAppWelcomeMat","UserPreferencesHideS1BrowserUI","UserPreferencesHideSecondChatterOnboardingSplash","UserPreferencesHideSfxWelcomeMat","UserPreferencesLightningExperiencePreferred","UserPreferencesNativeEmailClient","UserPreferencesNewLightningReportRunPageEnabled","UserPreferencesPathAssistantCollapsed","UserPreferencesPreviewCustomTheme","UserPreferencesPreviewLightning","UserPreferencesReceiveNoNotificationsAsApprover","UserPreferencesReceiveNotificationsAsDelegatedApprover","UserPreferencesRecordHomeReservedWTShown","UserPreferencesRecordHomeSectionCollapseWTShown","UserPreferencesReminderSoundOff","UserPreferencesReverseOpenActivitiesView","UserPreferencesShowCityToExternalUsers","UserPreferencesShowCityToGuestUsers","UserPreferencesShowCountryToExternalUsers","UserPreferencesShowCountryToGuestUsers","UserPreferencesShowEmailToExternalUsers","UserPreferencesShowEmailToGuestUsers","UserPreferencesShowFaxToExternalUsers","UserPreferencesShowFaxToGuestUsers","UserPreferencesShowForecastingChangeSignals","UserPreferencesShowManagerToExternalUsers","UserPreferencesShowManagerToGuestUsers","UserPreferencesShowMobilePhoneToExternalUsers","UserPreferencesShowMobilePhoneToGuestUsers","UserPreferencesShowPostalCodeToExternalUsers","UserPreferencesShowPostalCodeToGuestUsers","UserPreferencesShowProfilePicToGuestUsers","UserPreferencesShowStateToExternalUsers","UserPreferencesShowStateToGuestUsers","UserPreferencesShowStreetAddressToExternalUsers","UserPreferencesShowStreetAddressToGuestUsers","UserPreferencesShowTitleToExternalUsers","UserPreferencesShowTitleToGuestUsers","UserPreferencesShowWorkPhoneToExternalUsers","UserPreferencesShowWorkPhoneToGuestUsers","UserPreferencesSortFeedByComment","UserPreferencesSRHOverrideActivities","UserPreferencesSuppressEventSFXReminders","UserPreferencesSuppressTaskSFXReminders","UserPreferencesTaskRemindersCheckboxDefault","UserPreferencesUserDebugModePref","UserRoleId","UserType"]>,
}

const FILES = [
  "Account",
  "Contact",
  "EventRelation",
  "Survey_of_risk_factors__c",
  "Case",
  "Event",
  "Notification_reason__c",
  "User",
] as const satisfies (keyof FilesType)[];

interface RowWithId {
  readonly Id: string;
}

type Row<K extends string> = {readonly [k in K]: string};
type DataRow<F extends keyof FilesType> = Row<FilesType[F] | "Id">;

type FullDataType = {
  readonly [F in keyof FilesType]: FileData<DataRow<F>>;
};

interface FileData<Row extends RowWithId> {
  readonly rows: readonly Row[];
  has(Id: string): boolean;
  get(Id: string): Row;
}

function readRawCSV<K extends string>(file: string): Row<K>[] {
  return csv.parse(Deno.readTextFileSync(file), {skipFirstRow: true}) as unknown as Row<K>[];
}

function readCSV<Row extends RowWithId>(file: string, rowFilter?: (row: Row) => boolean): FileData<Row> {
  const rawRows = readRawCSV(file);
  if (rawRows[0] && !Object.hasOwn(rawRows[0], "Id")) {
    throw new Error(`File ${file} does not have Id column`);
  }
  const typedRows = rawRows as unknown as Row[];
  const rows = rowFilter ? typedRows.filter(rowFilter) : typedRows;
  const map = new Map<string, Row>();
  for (const row of rows) {
    map.set(row.Id!, row);
  }
  return {
    rows,
    has: (Id) => map.has(Id),
    get: (Id) => {
      const row = map.get(Id);
      if (!row) {
        throw new Error(`Row with Id='${Id}' not found in ${file}`);
      }
      return row;
    },
  };
}

console.log(`Reading export data from ${exportsDir}`);
const DATA = (() => {
  const data: Partial<Record<string, unknown>> = {};
  for (const file of FILES) {
    data[file] = readCSV(`${exportsDir}/${file}.csv`);
  }
  return data as FullDataType;
})();

type Event$Status_of_contact__c =
  | "completed"
  | "canceled by client"
  | ""
  | "client hasn't appear"
  | "canceled by employee";

console.log(`Reading static data from ${staticDataDir}`);

const STAFF = readCSV<Row<"Id" | "Name" | "Email" | "Facility">>(
  `${staticDataDir}/staff.csv`,
  (s) => s.Facility === "CDiR",
);

const MEETING_TYPES = readRawCSV<"Subject" | "Count" | "MeetingType" | "IsRemote" | "RetainSubject">(
  `${staticDataDir}/meeting_types.csv`,
);

console.log("Analysing data");

function _logFreq(values: unknown[], {sep = "\t"} = {}) {
  const freq = new Map<unknown, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  for (const [v, c] of [...freq].sort((a, b) => b[1] - a[1])) {
    console.debug(`${v}${sep}${c}`);
  }
}

function isRelevantContact(c: DataRow<"Contact">) {
  return c.AccountId && DATA.Account.has(c.AccountId);
}
const CONTACTS = DATA.Contact.rows.filter(isRelevantContact);

function isEventRelevant(e: DataRow<"Event">) {
  return !e.RecurrenceType && e.StartDateTime && e.AccountId && STAFF.has(e.OwnerId) && DATA.Contact.has(e.WhoId);
}
const EVENTS = DATA.Event.rows.filter(isEventRelevant);

const staff: Staff[] = STAFF.rows.map((s) => ({
  nn: s.Id,
  name: s.Name,
  email: s.Email,
}));

const giveStaff: GiveStaff[] = [];

const clients: Client[] = [];
const contactsByAccountId = Map.groupBy(CONTACTS, (c) => c.AccountId);
const casesByAccountId = Map.groupBy(DATA.Case.rows, (c) => c.AccountId);
const notificationReasonsByCaseId = Map.groupBy(DATA.Notification_reason__c.rows, (nr) => nr.Case__c);
const surveysByCaseId = Map.groupBy(DATA.Survey_of_risk_factors__c.rows, (s) => s.Case__c);
for (const [accountId, contacts] of contactsByAccountId) {
  const account = DATA.Account.get(accountId);
  const cases = casesByAccountId.get(accountId) || [];
  const notificationReasons = cases.flatMap((c) => notificationReasonsByCaseId.get(c.Id)) || [];
  const surveys = cases.flatMap((c) => surveysByCaseId.get(c.Id)) || [];

  for (const contact of contacts) {
    clients.push({
      nn: contact.Id,
      name: contact.Name,
      client: {},
    });
  }
}

const meetings: Meeting[] = [];
const relationsByMeetingId = Map.groupBy(DATA.EventRelation.rows, (er) => er.EventId);
const unknownMeetingSubjects = new Set<string>();
for (const [recurrenceActivityId, eventsGroup] of Map.groupBy(EVENTS, (e) => e.RecurrenceActivityId)) {
  eventsGroup.sort((a, b) => a.StartDateTime.localeCompare(b.StartDateTime));
  let fromMeetingNn = null;
  if (recurrenceActivityId && eventsGroup.length > 1) {
    fromMeetingNn = eventsGroup[0].Id;
  }
  for (const event of eventsGroup) {
    const start = new Date(event.StartDateTime);
    let status: Meeting["status"];
    let staffStatus: Attendant["attendanceStatus"] = "ok";
    let clientStatus: Attendant["attendanceStatus"] = "ok";
    const eventStatus = event.Status_of_contact__c as Event$Status_of_contact__c;
    if (eventStatus === "") {
      status = "planned";
    } else if (eventStatus === "completed") {
      status = "completed";
    } else if (eventStatus === "canceled by client") {
      status = "cancelled";
      clientStatus = "cancelled";
    } else if (eventStatus === "client hasn't appear") {
      status = "cancelled";
      clientStatus = "no_show";
    } else if (eventStatus === "canceled by employee") {
      status = "cancelled";
      staffStatus = "cancelled";
    } else {
      throw eventStatus satisfies never;
    }
    const clientIds = new Set(
      relationsByMeetingId
        .get(event.Id)
        ?.map((er) => er.RelationId)
        .filter((id) => DATA.Contact.has(id) && isRelevantContact(DATA.Contact.get(id))),
    );
    const meetingTypeInfo = MEETING_TYPES.find((mt) => mt.Subject === event.Subject);
    let typeDictNnOrName: string | undefined;
    if (meetingTypeInfo?.MeetingType === "other") {
      typeDictNnOrName = undefined;
    } else if (meetingTypeInfo?.MeetingType) {
      typeDictNnOrName = `meetingType:${meetingTypeInfo.MeetingType}`;
      if (!extendDictionaries.find((d) => d.name === "meetingType")?.positions.find((p) => p.nn === typeDictNnOrName))
        throw new Error(`Unknown meeting type: ${JSON.stringify(meetingTypeInfo.MeetingType)}`);
    } else {
      unknownMeetingSubjects.add(event.Subject);
      typeDictNnOrName = undefined;
    }
    clientIds.add(DATA.Contact.get(event.WhoId).Id);
    meetings.push({
      nn: event.Id,
      typeDictNnOrName: typeDictNnOrName || "other",
      isRemote: meetingTypeInfo?.IsRemote === "1",
      notes: [
        !meetingTypeInfo || !typeDictNnOrName || meetingTypeInfo?.RetainSubject === "1" ? event.Subject : undefined,
        event.Description,
      ]
        .filter(Boolean)
        .join("\n"),
      date: start.toISOString().slice(0, 10),
      startDayMinute: start.getHours() * 60 + start.getMinutes(),
      durationMinutes: Number(event.DurationInMinutes),
      status,
      staff: [{userNn: event.OwnerId, attendanceStatus: staffStatus}],
      clients: [...clientIds].map((clientId) => ({userNn: clientId, attendanceStatus: clientStatus})),
      fromMeetingNn,
    });
  }
}
if (unknownMeetingSubjects.size) {
  console.warn(
    `Unknown meeting subjects: ${unknownMeetingSubjects.size} (${[...unknownMeetingSubjects]
      .slice(0, 10)
      .map((e) => JSON.stringify(e))
      .join(", ")})`,
  );
}

const facilityContents: FacilityContents = {
  dictionaries,
  extendDictionaries,
  attributes,
  staff,
  giveStaff,
  clients,
  meetings,
};

console.log(`Writing result to ${outPath}`);
Deno.writeTextFileSync(outPath, JSON.stringify(facilityContents, undefined, 2));
console.log("Done");
