import {FullCalendar, ResourceGroup} from "components/ui";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";

export default (() => {
  const resourceGroups: ResourceGroup[] = [
    {
      label: () => <span class="font-bold">Terapeuci</span>,
      resources: [
        {id: "aaaaaa", label: () => <span>Pierwszy Terapeuta Pierwszy</span>},
        {id: "aaaaaab", label: () => <span>Drugi Terapeuta Drugi</span>},
        {id: "aaaaaac", label: () => <span>Trzeci Terapeuta Trzeci</span>},
        {id: "aaaaaad", label: () => <span>Czwarty Terapeuta Czwarty</span>},
        {id: "aaaaaae", label: () => <span>Piąty Terapeuta Piąty</span>},
        {id: "aaaaaa2", label: () => <span>Pierwszy Terapeuta Pierwszy</span>},
        {id: "aaaaaa2b", label: () => <span>Drugi Terapeuta Drugi</span>},
        {id: "aaaaaa2c", label: () => <span>Trzeci Terapeuta Trzeci</span>},
        {id: "aaaaaa2d", label: () => <span>Czwarty Terapeuta Czwarty</span>},
        {id: "aaaaaa2e", label: () => <span>Piąty Terapeuta</span>},
        {id: "aaaaaa3", label: () => <span>Pierwszy Terapeuta</span>},
        {id: "aaaaaa3b", label: () => <span>Drugi Terapeuta</span>},
        {id: "aaaaaa3c", label: () => <span>Trzeci Terapeuta</span>},
        {id: "aaaaaa3d", label: () => <span>Czwarty Terapeuta</span>},
        {id: "aaaaaa3e", label: () => <span>Piąty Terapeuta</span>},
        {id: "aaaaaa4", label: () => <span>Pierwszy Terapeuta</span>},
        {id: "aaaaaa4b", label: () => <span>Drugi Terapeuta</span>},
        {id: "aaaaaa4c", label: () => <span>Trzeci Terapeuta</span>},
        {id: "aaaaaa4d", label: () => <span>Czwarty Terapeuta</span>},
        {id: "aaaaaa4e", label: () => <span>Piąty Terapeuta</span>},
        {id: "aaaaaa5", label: () => <span>Pierwszy Terapeuta</span>},
        {id: "aaaaaa5b", label: () => <span>Drugi Terapeuta</span>},
        {id: "aaaaaa5c", label: () => <span>Trzeci Terapeuta</span>},
        {id: "aaaaaa5d", label: () => <span>Czwarty Terapeuta</span>},
        {id: "aaaaaa5e", label: () => <span>Piąty Terapeuta</span>},
      ],
    },
    {
      label: () => <span class="font-bold">Zasoby</span>,
      resources: [
        {id: "xaaaaaa", label: () => <span>Pierwszy zasób</span>},
        {id: "xaaaaaab", label: () => <span>Drugi zasób</span>},
        {id: "xaaaaaac", label: () => <span>Trzeci zasób</span>},
      ],
    },
    {
      label: () => <span class="font-bold">Pusty</span>,
      resources: [],
    },
  ];
  return (
    <FullCalendar
      class="w-full h-full"
      locale={new Intl.Locale("pl")}
      resourceGroups={resourceGroups}
      holidays={[
        [8, 15],
        [11, 11],
        [11, 1],
        [12, 25],
        [12, 26],
      ].map(([month, day]) => DateTime.fromObject({month, day}))}
    />
  );
}) satisfies VoidComponent;
