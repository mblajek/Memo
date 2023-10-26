import {VoidComponent, createSignal} from "solid-js";
import {Select, SelectItem} from "./components/ui/form/Select";
import {DictionarySelect} from "./components/ui/form/DictionarySelect";

export default (() => {
  // During development, this place can be used to create a fake page and test components.
  // It is available at /test-page, also via the "Test page" link in the menu (DEV mode only).
  // Do not submit the changes to this file.

  // To nie jest do submitowania, tylko żeby reviewer mógł sobie poklikać.
  const list = [
    {value: "1", text: "Jeden", label: () => <>Jeden 1</>},
    {value: "2", text: "Dwa", label: () => <>Dwa 2</>},
    {value: "3", text: "Trzy", label: () => <>Trzy 3</>},
    {
      value: "id1",
      text: "Kartofel",
      label: () => (
        <span title="pyra" class="text-green-500">
          Kartofel 🥔
        </span>
      ),
    },
    {value: "id2", text: "Marchewka", label: () => <>Marchewka</>},
    {value: "id3", text: "Pomidor", label: () => <>Pomidor</>},
    {value: "id4", text: "Pietruszka", label: () => <>Pietruszka</>},
    {value: "id5", text: "Cebula", label: () => <>Cebula</>},
    {value: "id6", text: "Kapusta", label: () => <>Kapusta</>},
    {value: "id7", text: "Rzodkiewka", label: () => <>Rzodkiewka</>},
    {value: "id8", text: "Kalafior", label: () => <>Kalafior</>},
    {value: "id9", text: "Brokuł", label: () => <>Brokuł</>},
    {value: "id10", text: "Brukselka", label: () => <>Brukselka</>},
    {value: "id11", text: "Ziemniak", label: () => <>Ziemniak</>},
    {value: "id12", text: "Dynia", label: () => <>Dynia</>},
    {value: "id13", text: "Bakłażan", label: () => <>Bakłażan</>},
    {value: "id14", text: "Cukinia", label: () => <>Cukinia</>},
    {value: "id15", text: "Papryka", label: () => <>Papryka</>},
    {value: "id16", text: "Kukurydza", label: () => <>Kukurydza</>},
    {value: "id17", text: "Stół", label: () => <>Stół</>},
    {value: "id18", text: "Krzesło", label: () => <>Krzesło</>},
    {value: "id19", text: "Kanapa", label: () => <>Kanapa</>},
    {value: "id20", text: "Fotel", label: () => <>Fotel</>},
    {value: "id21", text: "Łóżko", label: () => <>Łóżko</>},
    {value: "id22", text: "Szafa", label: () => <>Szafa</>},
    {value: "id23", text: "Komoda", label: () => <>Komoda</>},
    {value: "id24", text: "Stolik", label: () => <>Stolik</>},
    {value: "id25", text: "Lampa", label: () => <>Lampa</>},
    {value: "id26", text: "Lustro", label: () => <>Lustro</>},
    {value: "id27", text: "Zegar", label: () => <>Zegar</>},
    {value: "id28", text: "Obraz", label: () => <>Obraz</>},
    {value: "id29", text: "Książka", label: () => <>Książka</>},
    {value: "id30", text: "Telewizor", label: () => <>Telewizor</>},
    {value: "id31", text: "Radio", label: () => <>Radio</>},
    {value: "id32", text: "Konsola", label: () => <>Konsola</>},
    {value: "id33", text: "Komputer", label: () => <>Komputer</>},
    {value: "id34", text: "Laptop", label: () => <>Laptop</>},
    {value: "id35", text: "Telefon", label: () => <>Telefon</>},
    {value: "id36", text: "Tablet", label: () => <>Tablet</>},
    {value: "id37", text: "Klawiatura", label: () => <>Klawiatura</>},
    {value: "id38", text: "Myszka", label: () => <>Myszka</>},
    {value: "id39", text: "Monitor", label: () => <>Monitor</>},
    {value: "id40", text: "Głośniki", label: () => <>Głośniki</>},
    {value: "id41", text: "Słuchawki", label: () => <>Słuchawki</>},
    {value: "id42", text: "Mikrofon", label: () => <>Mikrofon</>},
    {value: "id43", text: "Kamera", label: () => <>Kamera</>},
    {value: "id44", text: "Mikser", label: () => <>Mikser</>},
    {value: "id45", text: "Młynek", label: () => <>Młynek</>},
    {value: "id46", text: "Blender", label: () => <>Blender</>},
    {value: "id47", text: "Kuchenka", label: () => <>Kuchenka</>},
    {value: "id48", text: "Piekarnik", label: () => <>Piekarnik</>},
    {value: "id49", text: "Mikrofalówka", label: () => <>Mikrofalówka</>},
    {value: "id50", text: "Zmywarka", label: () => <>Zmywarka</>},
    {value: "id51", text: "Kurtka", label: () => <>Kurtka</>},
    {value: "id52", text: "Spodnie", label: () => <>Spodnie</>},
    {value: "id53", text: "Koszula", label: () => <>Koszula</>},
    {value: "id54", text: "Sweter", label: () => <>Sweter</>},
    {value: "id55", text: "Buty", label: () => <>Buty</>},
    {value: "id56", text: "Kapelusz", label: () => <>Kapelusz</>},
    {value: "id57", text: "Krawat", label: () => <>Krawat</>},
    {value: "id58", text: "Sukienka", label: () => <>Sukienka</>},
    {value: "id59", text: "Spódnica", label: () => <>Spódnica</>},
    {value: "id60", text: "Bluzka", label: () => <>Bluzka</>},
    {value: "id61", text: "Koszulka", label: () => <>Koszulka</>},
    {value: "id62", text: "Spodenki", label: () => <>Spodenki</>},
    {value: "id63", text: "Szorty", label: () => <>Szorty</>},
    {value: "id64", text: "Kostium kąpielowy", label: () => <>Kostium kąpielowy</>},
    {value: "id65", text: "Okulary przeciwsłoneczne", label: () => <>Okulary przeciwsłoneczne</>},
    {value: "id66", text: "Kosmetyki", label: () => <>Kosmetyki</>},
    {value: "id67", text: "Szampon", label: () => <>Szampon</>},
    {value: "id68", text: "Odżywka", label: () => <>Odżywka</>},
    {value: "id69", text: "Mydło", label: () => <>Mydło</>},
    {value: "id70", text: "Pasta do zębów", label: () => <>Pasta do zębów</>},
    {value: "id71", text: "Szczoteczka do zębów", label: () => <>Szczoteczka do zębów</>},
    {value: "id72", text: "Perfumy", label: () => <>Perfumy</>},
    {value: "id73", text: "Dezodorant", label: () => <>Dezodorant</>},
    {value: "id74", text: "Puder", label: () => <>Puder</>},
    {value: "id75", text: "Podkład", label: () => <>Podkład</>},
    {value: "id76", text: "Róż", label: () => <>Róż</>},
    {value: "id77", text: "Cień do powiek", label: () => <>Cień do powiek</>},
    {value: "id78", text: "Tusz do rzęs", label: () => <>Tusz do rzęs</>},
    {value: "id79", text: "Kredka do oczu", label: () => <>Kredka do oczu</>},
    {value: "id80", text: "Pomadka", label: () => <>Pomadka</>},
    {value: "id81", text: "Błyszczyk", label: () => <>Błyszczyk</>},
    {value: "id82", text: "Pędzel do makijażu", label: () => <>Pędzel do makijażu</>},
    {value: "id83", text: "Gąbka do makijażu", label: () => <>Gąbka do makijażu</>},
    {value: "id84", text: "Krem do rąk", label: () => <>Krem do rąk</>},
    {value: "id85", text: "Krem do twarzy", label: () => <>Krem do twarzy</>},
    {value: "id86", text: "Krem do stóp", label: () => <>Krem do stóp</>},
    {value: "id87", text: "Peeling do ciała", label: () => <>Peeling do ciała</>},
    {value: "id88", text: "Peeling do twarzy", label: () => <>Peeling do twarzy</>},
    {value: "id89", text: "Maseczka do twarzy", label: () => <>Maseczka do twarzy</>},
    {value: "id90", text: "Olejek do ciała", label: () => <>Olejek do ciała</>},
    {value: "id91", text: "Olejek do włosów", label: () => <>Olejek do włosów</>},
    {value: "id92", text: "Szampon suchy", label: () => <>Szampon suchy</>},
    {value: "id93", text: "Pianka do włosów", label: () => <>Pianka do włosów</>},
    {value: "id94", text: "Lakier do włosów", label: () => <>Lakier do włosów</>},
    {value: "id95", text: "Odżywka do włosów", label: () => <>Odżywka do włosów</>},
    {value: "id96", text: "Szampon do włosów", label: () => <>Szampon do włosów</>},
    {value: "id97", text: "Masło do ciała", label: () => <>Masło do ciała</>},
    {value: "id98", text: "Balsam do ciała", label: () => <>Balsam do ciała</>},
    {value: "id99", text: "Krem do depilacji", label: () => <>Krem do depilacji</>},
    {value: "id100", text: "Pianka do golenia", label: () => <>Pianka do golenia</>},
  ];
  const [selectItems, setSelectItems] = createSignal<SelectItem[]>(list);
  const [selectValue, setSelectValue] = createSignal<string>();
  const [selectMultiValue, setSelectMultiValue] = createSignal<string[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  return (
    <>
      <fieldset>
        <div class="flex flex-col gap-1">
          <Select
            class="w-96"
            name="sel0"
            nullable={true}
            items={selectItems()}
            onFilterChange="internal"
            placeholder="duży"
          />
          {selectValue()}
          <Select
            class="w-96"
            name="sel2"
            nullable={true}
            items={selectItems()}
            // onFilterChange={(v) =>
            //   setSelectItems(list.filter(({text}) => !v || text.toLocaleLowerCase().includes(v.toLocaleLowerCase())))
            // }
            value={selectValue()}
            onValueChange={setSelectValue}
            placeholder="duży"
          />
          <Select
            class="w-28"
            name="sel2"
            nullable={true}
            items={selectItems()}
            onFilterChange={(v) =>
              setSelectItems(list.filter(({text}) => !v || text.toLocaleLowerCase().includes(v.toLocaleLowerCase())))
            }
            value={selectValue()}
            onValueChange={setSelectValue}
            placeholder="mały"
            small
          />
          {selectMultiValue().join(",")}
          <fieldset>
            <Select
              class="w-96"
              name="selm1"
              items={selectItems()}
              // onFilterChange={(v) =>
              //   setSelectItems(list.filter(({text}) => !v || text.toLocaleLowerCase().includes(v.toLocaleLowerCase())))
              // }
              multiple
              value={selectMultiValue()}
              onValueChange={setSelectMultiValue}
              placeholder="duży"
              showClearButton={false}
              disabled={false}
            />
          </fieldset>
          <fieldset>
            <Select
              class="w-28"
              name="selm2"
              isLoading={isLoading()}
              items={selectItems()}
              onFilterChange={(v) => {
                setIsLoading(true);
                setTimeout(() => {
                  setSelectItems(
                    list.filter(({text}) => !v || text.toLocaleLowerCase().includes(v.toLocaleLowerCase())),
                  );
                  setIsLoading(false);
                }, 1000);
              }}
              multiple
              value={selectMultiValue()}
              onValueChange={setSelectMultiValue}
              placeholder="mały"
              small
            />
          </fieldset>
          <DictionarySelect class="w-40" name="p1" dictionary="gender" filterable={false} nullable />
          <DictionarySelect
            class="w-40"
            name="p1"
            dictionary="gender"
            multiple
            itemFunc={(pos, defItem) => ({
              ...defItem(),
              // Allow filtering by both translated and untranslated text.
              text: `${pos.label} (${pos.resource.name})`,
              labelOnList: () => (
                <>
                  {pos.label} <span class="text-black text-opacity-60">({pos.resource.name})</span>
                </>
              ),
            })}
            filterable
          />
        </div>
      </fieldset>
    </>
  );
}) satisfies VoidComponent;
