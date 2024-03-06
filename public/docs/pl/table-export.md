# Eksport tabel

Dane z tabel w systemie Memo można eksportować do plików. Dostępne są następujące formaty eksportu:

- **$t(tables.export.format.csv)** —
  Uniwersalny plik CSV, odpowiedni do archiwizowania danych oraz czytany przez wiele programów,
  np. Google Spreadsheet (Google Drive/Docs).

  **Uwaga:** Program Microsoft Excel błędnie wczytuje pliki tego typu. Jeżeli chcesz wczytać dane do
  programu Excel, użyj formatu **$t(tables.export.format.excel_csv)**, lub skonwertuj plik CSV do
  formatu XSLX, na przykład za pomocą Google Spreadsheet.

- **$t(tables.export.format.excel_csv)** —
  Plik typu CSV w formacie niestandardowym, ale za to zgodnym z programem Excel.
  Nie można go otworzyć w żadnym innym programie.

  Jeżeli pliki .csv są skojarzone w systemie z programem Excel, plik można otworzyć podwójnym kliknięciem.
  Alternatywnie można użyć funkcji _Otwórz_ w programie Excel, lub też kliknąć prawym przyciskiem
  myszy na pliku, wybrać _Otwórz jako…_ a następnie Excel.
