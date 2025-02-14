Dostępne są następujące formaty eksportu plików CSV z systemu:

- **$t(csv_export.format.csv)** —
  Uniwersalny plik CSV, odpowiedni do archiwizowania danych oraz czytany przez wiele programów,
  np. [Google Sheets (Google Drive/Docs)](https://drive.google.com/). Można też odczytać jego zawartość w notatniku.

  **Uwaga:** Program Microsoft Excel błędnie wczytuje pliki tego typu. Jeżeli chcesz wczytać dane do
  programu Excel, użyj formatu **$t(csv_export.format.excel_csv)**, lub skonwertuj plik CSV do
  formatu XSLX, na przykład za pomocą Google Sheets.

- **$t(csv_export.format.excel_csv)** —
  Plik typu CSV w formacie niestandardowym, ale za to zgodnym z programem Excel.
  Nie można go otworzyć w żadnym innym programie.

  Jeżeli pliki .csv są skojarzone w systemie z programem Excel, zapisany plik można otworzyć podwójnym kliknięciem.
  Alternatywnie można użyć funkcji _Otwórz_ w programie Excel, lub też kliknąć prawym przyciskiem
  myszy na pliku, wybrać _Otwórz jako…_, a następnie Excel.

**Uwaga:** Eksportowanie plików nie działa obecnie w przeglądarce Firefox. Działa poprawnie w Chrome
i Edge, a także w mobilnej wersji Chrome na urządzenia z Androidem.
