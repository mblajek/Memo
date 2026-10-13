import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {FacilityResource} from "data-access/memo-api/resources/facility.resource";
import {htmlAttributes} from "components/utils/html_attributes";
import {createRoot, createSignal, JSX, VoidComponent} from "solid-js";

const DEFAULT_ICON_HREF = "/img/cpd_children_logo.svg";

type IconFacility = Pick<FacilityResource, "id" | "iconHash">;

type PersistentState = {
  readonly facility: IconFacility | null;
};

/** Returns the href of the facility's own icon, or undefined if the facility has no icon. */
function getFacilityIconHref(facility: IconFacility) {
  return facility.iconHash ? `/api/v1/system/facility/${facility.id}/icon?h=${facility.iconHash}` : undefined;
}

export function svgDataURL(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * The facility whose icon is shown: the one last set, or, before any is set in this tab, the one
 * last set in this browser.
 */
const [iconFacility, iconFacilitySetter] = createSignal<IconFacility>();

createRoot(() =>
  createPersistence<PersistentState>({
    storage: localStorageStorage("FacilityIcon"),
    value: () => {
      const facility = iconFacility();
      return {facility: facility ? {id: facility.id, iconHash: facility.iconHash} : null};
    },
    onLoad: (value) => iconFacilitySetter(value.facility || undefined),
    version: [1],
  }),
);

/** Sets the facility whose icon is shown. It is remembered in this browser. */
export function setIconFacility(facility: IconFacility) {
  iconFacilitySetter(facility);
}

function useIconData() {
  const [failedHref, setFailedHref] = createSignal<string>();
  return {
    href: () => {
      const facility = iconFacility();
      const href = facility && getFacilityIconHref(facility);
      return href && href !== failedHref() ? href : DEFAULT_ICON_HREF;
    },
    /** Reports that the image at the href failed to load. */
    onError: (href: string | null) => {
      if (href && href !== DEFAULT_ICON_HREF) {
        setFailedHref(href);
      }
    },
  };
}

/** The icon of the facility, or the default icon. */
export const FacilityIcon: VoidComponent<htmlAttributes.img> = (props) => {
  const iconData = useIconData();
  return (
    <img {...props} src={iconData.href()} onError={(e) => iconData.onError(e.currentTarget.getAttribute("src"))} />
  );
};

/** The icon of the facility, or the default icon, as an element of an SVG image. */
export const FacilityIconSVGImage: VoidComponent<JSX.SVGElementTags["image"]> = (props) => {
  const iconData = useIconData();
  return (
    <image {...props} href={iconData.href()} onError={(e) => iconData.onError(e.currentTarget.getAttribute("href"))} />
  );
};
