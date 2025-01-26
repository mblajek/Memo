import {createQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {Modifiable} from "components/utils/modifiable";
import {System} from "data-access/memo-api/groups/System";
import {translationsLoaded} from "i18n_loader";
import {Accessor, ParentComponent, createContext, createMemo, useContext} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Attributes} from "./attributes";
import {Dictionaries} from "./dictionaries";

const Context = createContext<ContextValue>();

interface ContextValue {
  readonly allDictionaries: Accessor<Dictionaries | undefined>;
  readonly dictionaries: Accessor<Dictionaries | undefined>;
  readonly allAttributes: Accessor<Attributes | undefined>;
  readonly attributes: Accessor<Attributes | undefined>;
}

interface Props {
  readonly allDictionaries?: Accessor<Dictionaries | undefined>;
  readonly allAttributes?: Accessor<Attributes | undefined>;
}

/**
 * Provides dictionaries and attributes in the context.
 *
 * The values from props are used, if provided. Otherwise, if a parent context of the same type exists,
 * its values are forwarded. Otherwise this is the root context and it fetches the dictionaries and attributes.
 */
export const DictionariesAndAttributesProvider: ParentComponent<Props> = (props) => {
  const t = useLangFunc();
  // Treat the attributes as static.
  // eslint-disable-next-line solid/reactivity
  const {allDictionaries, allAttributes} = props;
  const thisContext: Partial<Modifiable<ContextValue>> = {};
  const parentContext = useContext(Context);
  if (allDictionaries) {
    thisContext.allDictionaries = allDictionaries;
  } else if (parentContext) {
    thisContext.allDictionaries = parentContext.allDictionaries;
    thisContext.dictionaries = parentContext.dictionaries;
  } else {
    const dictionariesQuery = createQuery(System.dictionariesQueryOptions);
    thisContext.allDictionaries = createMemo(() => {
      if (!dictionariesQuery.isSuccess) {
        return undefined;
      }
      // Make sure the translations are loaded. Here it is critical because the created Dictionary objects
      // are not reactive and will not update later.
      if (!translationsLoaded()) {
        return undefined;
      }
      return Dictionaries.fromResources(t, dictionariesQuery.data);
    });
  }
  if (!thisContext.dictionaries)
    thisContext.dictionaries = createMemo(() => thisContext.allDictionaries!()?.subsetFor(activeFacilityId()));
  if (allAttributes) {
    thisContext.allAttributes = allAttributes;
  } else if (parentContext) {
    thisContext.allAttributes = parentContext.allAttributes;
    thisContext.attributes = parentContext.attributes;
  } else {
    const attributesQuery = createQuery(System.attributesQueryOptions);
    thisContext.allAttributes = createMemo(() => {
      const dicts = thisContext.allDictionaries!();
      if (!attributesQuery.isSuccess || !dicts) {
        return undefined;
      }
      // Make sure the translations are loaded. Here it is critical because the created Attributes objects
      // are not reactive and will not update later.
      if (!translationsLoaded()) {
        return undefined;
      }
      return Attributes.fromResources(t, dicts, attributesQuery.data);
    });
  }
  if (!thisContext.attributes)
    thisContext.attributes = createMemo(() => thisContext.allAttributes!()?.subsetFor(activeFacilityId()));
  return <Context.Provider value={thisContext as ContextValue}>{props.children}</Context.Provider>;
};

function assertContext() {
  const contextValue = useContext(Context);
  if (!contextValue) {
    throw new Error("No dictionaries and attributes context found");
  }
  return contextValue;
}

/** Returns a Dictionaries object containing all the dictionaries in the system. */
export function useAllDictionaries() {
  return assertContext().allDictionaries;
}

/**
 * Returns a Dictionaries object with the dictionaries available in the current facility, or global
 * if there is no current facility.
 */
export function useDictionaries() {
  return assertContext().dictionaries;
}

/** Returns an Attributes object containing all the attributes in the system. */
export function useAllAttributes() {
  return assertContext().allAttributes;
}

/**
 * Returns an Attributes object with the dictionaries available in the current facility, or global
 * if there is no current facility.
 */
export function useAttributes() {
  return assertContext().attributes;
}
