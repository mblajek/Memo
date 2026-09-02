import {useQuery} from "@tanstack/solid-query";
import {capitalizeString} from "components/ui/Capitalize";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {NameStringView} from "components/ui/NameStringView";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {useLangFunc} from "components/utils/lang";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

type _Directives = typeof title;

interface Props {
  readonly dictionaryId: string;
  /** Whether to mark a dictionary that does not belong to the active facility. */
  readonly warnNotInFacility?: boolean;
}

/** A compact single-line description of the viewed dictionary, for the positions table header. */
export const DictionaryHeader: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const allDictionaries = useAllDictionaries();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const dictionary = () => allDictionaries()?.get(props.dictionaryId);
  const facilityName = () => {
    const facilityId = dictionary()?.resource.facilityId;
    return facilityId ? facilitiesQuery.data?.find((facility) => facility.id === facilityId)?.name : undefined;
  };
  return (
    <Show when={dictionary()}>
      {(dictionary) => (
        <div class="mb-0.5 flex flex-wrap items-baseline gap-x-4">
          <span>
            <span class="capitalize">{t("with_colon", {text: t("models.dictionary._name")})}</span>{" "}
            <b
              use:title={`${capitalizeString(t("with_colon", {text: t("models.dictionary.rawName")}))} ${dictionary().name}`}
            >
              <NameStringView name={dictionary().name} label={dictionary().label} />
            </b>
            <Show
              when={props.warnNotInFacility && !facilityIdMatches(dictionary().resource.facilityId, activeFacilityId())}
            >
              <span use:title={t("attributes.attribs_and_dicts.dictionary_not_in_facility")}>
                <WarningMark />
              </span>
            </Show>{" "}
            <span class="text-xs">
              (<span class="font-mono">…{dictionary().id.slice(-4)}</span>
              <CopyToClipboard text={dictionary().id} />)
            </span>
          </span>
          <span>
            <Show when={facilityName()} fallback={<>{t("attributes.attribs_and_dicts.global_dictionary")}</>}>
              {(facilityName) => (
                <>
                  <span class="capitalize">{t("with_colon", {text: t("models.facility._name")})}</span>{" "}
                  <b>{facilityName()}</b>
                </>
              )}
            </Show>
          </span>
          <span use:title={t("models.dictionary.isFixed")}>
            Fixed: {t(dictionary().resource.isFixed ? "bool_values.yes" : "bool_values.no")}
          </span>
        </div>
      )}
    </Show>
  );
};
