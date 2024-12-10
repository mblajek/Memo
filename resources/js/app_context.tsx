import {Owner, ParentComponent, createContext, getOwner, runWithOwner, useContext} from "solid-js";

const AppContext = createContext<AppContext>();

export interface AppContext {
  /**
   * An app-wide owner, with initialised translations and query client.
   * It is not cleaned up as long as the app is active.
   */
  readonly owner: Owner;
  runInAppContext<T>(fn: () => T): T;
}

export const AppContextProvider: ParentComponent = (props) => {
  // The app-wide owner provided by this provider needs to also include this very provider, so that
  // useAppContext called with that owner works. That's why the provided owner is initialised from
  // within the provider.
  let owner: Owner | undefined;
  const appContext: AppContext = {
    get owner() {
      return owner!;
    },
    runInAppContext: (fn) => runWithOwner(owner!, fn)!,
  };
  const InnerOwnerGetter: ParentComponent = (props) => {
    owner = getOwner()!;
    return <>{props.children}</>;
  };
  return (
    <AppContext.Provider value={appContext}>
      <InnerOwnerGetter>{props.children}</InnerOwnerGetter>
    </AppContext.Provider>
  );
};

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(`Not in app context`);
  }
  return context;
}
