<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $date = '2023-11-23 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        $categoryDictionaryId = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
        $typeDictionaryId = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';

        DB::table('positions')->where('id', '137205e2-e9a1-4f8f-ada2-555319506b28')->update(['default_order' => 999]);
        DB::table('positions')->where('id', '6e87acd5-70a0-4051-963b-42d439f44e42')->update(['default_order' => 999]);

        //@formatter:off
        $categories = [
            ['id' => 'ac0ff36f-22fe-4937-a780-c1c42e46ed04', 'name' => '+Konsultacje psychologiczne'],
            ['id' => '2d74c06f-f50c-4082-b47f-e8f9c28ce65d', 'name' => '+Wewnętrzne'],
            ['id' => '8cc1f007-0271-40dc-a71c-09b5aa02f24c', 'name' => '+Profesjonaliści'],
            ['id' => '359a0e7e-a795-4b38-bfc4-04dcf7c1cc86', 'name' => '+Grupy'],
            ['id' => '137205e2-e9a1-4f8f-ada2-555319506b28', 'name' => 'other'],
        ];
        $typesArray = [
            [
                'd1a84858-dc57-42a5-afe9-f2fc84adbcf1','Badanie sądowo-psychologiczne', // position.id / position.name
                'fadcf7cb-f430-48bf-a7c5-2048860aa7e3',120, // duration value.id / value.it_value
                '02e5220d-a6a3-4888-b66a-ef929f5a9d3a','ac0ff36f-22fe-4937-a780-c1c42e46ed04', // category value.id / value.ref_dict_id
            ],
            ['6ac7facd-7571-40dc-9fe1-c221ecab5904','+Konsultacja do grupy','3ed8cdf1-9c7b-468c-ad8d-3485f92aa49f',60,'b8a26dc5-9251-4aba-b855-ad90a270be57','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['b5402e2f-b6ee-4bed-87ab-8f587ca611fa','+Konsultacja kwalifikująca','fc1e9d1b-6863-4d44-ba44-923e5ea8b8c0',60,'42d2a81b-f396-4121-a9b3-75d80b886f51','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['00415373-ec74-4e8e-bb76-37d4254b6b61','+Konsultacja pierwszorazowa','eb616cbc-f49f-4796-beab-90b3d470430b',90,'c716e3f8-2911-4de5-8de3-6b681c860f46','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['65fa6e18-e586-4e47-b2b4-ce3ff356c1f0','+Konsultacja psychologiczna','e9faab19-539c-4e27-969f-5903e0db1ba9',60,'0bd082ff-53fe-4f00-86cd-0586c1f8a36f','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['1da4ab6c-4990-4d3f-99bf-dd357fb52dd2','+Konsultacja rodzinna','c38702eb-1913-4b3a-87d9-e0a168009762',60,'bf2303bf-2449-4ea8-9be4-3c0f078b18d6','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['f33bd40b-db4b-46a1-80e5-121737e7912d','+Konsultacja wsparciowa (przed przesłuchaniem)','4cfd5a95-7fe4-4cf1-b2fc-77236f254174',60,'1732eed2-d4c3-44bb-889b-fe0db2adcb6f','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['513e323c-5ed3-4ae2-a888-eadb4ed9a26d','+Konsultacja z parą','5882481d-c3fd-4f38-9faf-8ae4e81f67e8',60,'a44b7c88-9f6f-401d-b14f-943c19945a22','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['98e3381b-c777-4bf0-968a-0d5a841cebce','+Konsultacja z rodzicem','3235ed0a-3787-4491-8732-abe6d2be8981',60,'8a4e636e-a8c6-4be9-b59a-0f97c6f0c02c','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['da1f97a6-9c21-4274-b57e-4f6d8457945c','+Przygotowanie do przesłuchania','ee74f297-8ac3-4d3b-9c05-2300161d93c6',30,'e09a3474-2b01-488a-87c9-79032270ca66','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['d2cb09ac-7b8b-47bd-a688-848819ea8366','+Terapia indywidualna','bd55e8d5-5f02-4933-bc59-7687f050ed3c',60,'540d4429-5756-460d-bb48-35da4dfce536','ac0ff36f-22fe-4937-a780-c1c42e46ed04'],
            ['173e3c7d-6cf2-475c-845a-1dfe6b3c602c','+Czynności służbowe','8184a49a-4cff-47b7-9aa1-17e6b905b32d',60,'02473191-0790-43f0-a9cd-1711203d5da6','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['1c89f6bd-1048-4b73-8680-e710ef830d83','+Dyżur telefoniczny 800 100 100','25a9ddb9-5729-4f49-9a14-973c137816dd',60,'cc9df1a0-71a9-492a-9431-72c519ca1df8','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['2ddb713a-a290-41a7-8fb7-2875dd55cc52','+Korepetycje','70a84105-19b3-4e55-9f59-027ec0cb5313',60,'a8752258-e990-4548-a9c1-1ab9453a78db','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['0ceed635-e99a-41ca-ad3a-10e3c932fe18','+Konferencja','a46d1764-173c-450f-b8d5-6563059c5950',420,'ed13b594-2460-4556-9e43-c536e89c03d6','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['e0114a73-2cc5-4a9d-a1ab-41c46199a532','+Przesłuchanie pracownika','5635d118-c182-4c91-bfb8-6f524337c38e',120,'b287a327-51ac-4bec-be6e-5f7d24e21480','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['4e0884f5-b739-4518-9e8b-ca18ca98b7c4','+Staż','418c916c-dd98-412d-8426-37ce1271f596',180,'d62e9943-dde7-4f89-9a53-d47672bbbf5a','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['076c8c6e-cd8d-4cd3-bfae-299d35b48b31','+Spotkanie ewaluacyjne','225afe1c-2d3d-4321-a01b-758c16096daf',60,'e99ed1a1-b9f5-4b24-b469-03f5ab598776','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['9e7dea42-78dd-4a0b-88c1-7a1ad7b03d40','+Spotkanie służbowe','8002d981-1475-4932-b085-e2b93e11ce93',120,'20ccef80-5bb4-49f1-b544-12c40840b359','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['32596163-d817-454b-93ed-a4b706254cac','+Superwizja zespołu','50029445-d968-465c-8002-920355a83153',180,'f6e3e9d9-824f-4923-9042-64856eaf19fa','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['faebf171-2c52-4112-8b25-194e024b96d6','+Szkolenie','e0d1829c-3423-413e-9337-baa037c88beb',60,'9457b8db-e172-47b2-b1a6-d7dbdd60f133','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['426dfacf-4263-492c-ad08-dec710efa3b6','+ZPT','b3c3bc3a-b4f9-491d-b077-ee684affb2fd',180,'03945d10-5712-4ffb-b6c2-39a3e34818c9','2d74c06f-f50c-4082-b47f-e8f9c28ce65d'],
            ['e8275db0-2d70-4b3d-9666-45dd35271119','+Klub Biegłego','8f0c602b-cb82-4237-a6bb-32e550a17915',240,'0c7e3a23-0fb4-4fb3-baf7-11bc0d17046c','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['4435b3de-2168-4751-ab6e-e0dcd8e8d9c8','+Konsultacja z profesjonalistą','74d3f897-bbcf-433b-aae9-9864050be689',60,'cd5d503c-0107-4528-8b76-cb4fdcc16fa9','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['267f1ace-4250-4275-9238-9d4d34022297','+Spotkanie interdyscyplinarne','b3ca5cfa-7d36-4843-8e24-5d53f777ac47',60,'ef676f25-3b15-4ec5-9bea-fd452868eaa4','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['1a9918fd-806d-42a6-9b8d-aac44d04c753','+Superwizja WSPD','e2718133-d399-4342-8361-e09dd00250ca',150,'8760ac4a-308f-48b5-b36f-3e34ee0683d0','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['d9aae3dc-087f-4f08-9a94-a0dfda70ad44','+Superwizja z profesjonalistą','7ce6d3c6-9bc7-4786-a076-fd166dfa8500',60,'9e20a99f-056d-4e66-a44f-9c1888efe78b','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['24d98f70-d29a-413e-afc3-f0646fc6861b','+Zespół Interdyscyplinarny','6b075a18-f0ef-4328-bc25-6f4fd8e1b3db',480,'55565620-de2c-4534-a56e-118581eb4edd','8cc1f007-0271-40dc-a71c-09b5aa02f24c'],
            ['8657cb72-4908-4761-b3f0-afb53bc94e40','+Akademia Medyczna ','650cf1f0-b421-49e7-a5a4-acbdba17ff24',180,'e71e6218-88b0-41b5-b2ed-b6b36e82fa1a','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['fa87f4a1-0498-4ad7-a08d-2cbd2b0b1c2e','+Grupa Cudzoziemców','42238f5d-0180-469f-b3fc-4349a115b11b',120,'5b6335cd-7970-4c30-86d5-c2bc72c5a862','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['f1e7f8f0-baea-45c0-8ee4-ce8448c8e9cc','+Grupa Lighthouse','1a24d7dc-347c-4b2a-ac8a-73c66df9a99c',120,'a41eb201-008a-4e61-9105-3bcf82a7e320','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['649ef54a-1e26-40e4-a0ca-9cf7f2de8036','+Grupa Taneczna','6207366a-d449-42ed-ba70-636a92727424',120,'4178ceee-f676-44c5-81e0-de11526d0df3','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['92687c9c-8b05-4897-9b6d-5c8ff4770e64','+Grupa dla Rodzin Zastępczych','c6777cf1-2660-4b60-9f08-e64e92b6f89a',180,'cf4024fe-2b73-4d2e-98e5-2ffee29be4d9','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['8b7b356e-4600-4ea5-b4ca-8f2c532a2236','+Grupa dla matek','578e958b-d6b8-4bbe-9157-3519a2a2e900',180,'34edb90f-b645-4528-b23a-2852aa335879','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['79fa8b8a-f5d2-4c40-aa31-3f159f274364','+Grupa robocza','cfa04616-2f7c-4f1c-a0a4-5d49351c35d7',60,'2ef43c6c-39b5-4a51-b6ef-8b55340d63ba','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['ad27745d-f8f6-482e-8de5-0da24c49f45a','+Grupa socjoterapeutyczna','e80f8f80-fc28-4903-8534-a432b2bef5f3',90,'8267b6b5-f60d-4493-aef3-58ab65b8b35e','359a0e7e-a795-4b38-bfc4-04dcf7c1cc86'],
            ['04d90191-d6f5-43c9-bdd8-e76fea49c5e3','+Konsultacja prawna ','b7865d7f-5270-4831-b9c8-3a4e97cad81b',60,'b9dd6a9a-3960-4603-82a5-81d565ce4801','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['ef27d40a-e674-404b-8e71-4241b0526a75','+Konsultacja psychiatryczna','c8768f72-1ba5-4e6e-8ddc-9c8501b88aac',60,'3978197b-e0b5-4a0e-ba72-e2355de0cc01','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['065cc0c3-8d88-435d-8327-1df5339949f3','+Media (wywiad/nagranie)','682b1bbd-d9dd-4929-b89c-b062803196e6',60,'af42df43-93eb-4570-a706-ac0315e8a992','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['13426c6d-dda0-4e93-89cd-9915bb8bdb43','+Przesłuchanie','a5399f25-41e4-472b-a167-27d13bfd0c4c',60,'f52a7703-320e-4da9-b51e-dc19a510cd7c','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['ba7b2033-2cbc-47c7-86ad-ea8d6332ccc4','+Zebranie kliniczne','664d2ac9-d278-4afb-aa8d-38f1d427faae',270,'ceedf1a8-04b2-4e36-83c9-13bb20a5514a','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['514f324e-164f-4986-8278-b38b515d573f','+Konsultacja lekarska','0ec36921-096e-41bc-b510-ea1024886310',60,'934bec73-4a19-492b-975e-1793ac219f56','137205e2-e9a1-4f8f-ada2-555319506b28'],
            ['e8b19afd-9d4c-4ef0-909e-68d12cff37ec','+Konsultacja socjalna','8a70283b-5fc3-40ba-a7a5-fe3f8cac7c24',60,'2cabd5bc-a44b-4817-a578-084e382a0367','137205e2-e9a1-4f8f-ada2-555319506b28'],
        ];
        //@formatter:on
        $positions = [];
        $values = [];
        foreach ($categories as $i => $category) {
            $positions[] = $category + [
                    'default_order' => $i + 1,
                    'dictionary_id' => $categoryDictionaryId,
                    'is_fixed' => false,
                    'is_disabled' => false,
                    'created_by' => $systemUserId,
                    'created_at' => $date,
                    'updated_at' => $date,
                ];
        }
        foreach ($typesArray as $i => $type) {
            [$colId, $colName, $colDurationId, $colDurationValue, $colCategoryId, $colCategoryValue] = $type;
            $positions[] = [
                'id' => $colId,
                'name' => $colName,
                'default_order' => $i + 1,
                'dictionary_id' => $typeDictionaryId,
                'is_fixed' => false,
                'is_disabled' => false,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $values [] = [
                'id' => $colDurationId,
                'attribute_id' => '540e2b26-1330-42ae-8209-55cf22bb3638',
                'object_id' => $colId,
                'ref_dict_id' => null,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => (int)$colDurationValue,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $values [] = [
                'id' => $colCategoryId,
                'attribute_id' => 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b',
                'object_id' => $colId,
                'ref_dict_id' => $colCategoryValue,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ];
        }

        DB::table('positions')->upsert($positions, 'id');
        DB::table('values')->upsert($values, 'id');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
