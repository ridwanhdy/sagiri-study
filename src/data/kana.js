const rows = [
  ['vowels', 'Vokal', 'Awali dari lima bunyi dasar.', [
    ['あ','a',[],'あめ','Hujan'], ['い','i',[],'いぬ','Anjing'], ['う','u',[],'うみ','Laut'], ['え','e',[],'えき','Stasiun'], ['お','o',[],'おかね','Uang']]],
  ['k', 'Kelompok K', 'Bunyi ka, ki, ku, ke, ko.', [
    ['か','ka',[],'かさ','Payung'], ['き','ki',[],'き','Pohon'], ['く','ku',[],'くち','Mulut'], ['け','ke',[],'けむり','Asap'], ['こ','ko',[],'こえ','Suara']]],
  ['s', 'Kelompok S', 'Perhatikan bunyi shi pada し.', [
    ['さ','sa',[],'さかな','Ikan'], ['し','shi',['si'],'しお','Garam'], ['す','su',[],'すし','Sushi'], ['せ','se',[],'せかい','Dunia'], ['そ','so',[],'そら','Langit']]],
  ['t', 'Kelompok T', 'Kenali bunyi chi dan tsu.', [
    ['た','ta',[],'たまご','Telur'], ['ち','chi',['ti'],'ちかてつ','Kereta bawah tanah'], ['つ','tsu',['tu'],'つき','Bulan'], ['て','te',[],'て','Tangan'], ['と','to',[],'とり','Burung']]],
  ['n', 'Kelompok N', 'Lima bunyi dengan awalan n.', [
    ['な','na',[],'なつ','Musim panas'], ['に','ni',[],'にく','Daging'], ['ぬ','nu',[],'ぬの','Kain'], ['ね','ne',[],'ねこ','Kucing'], ['の','no',[],'のり','Rumput laut']]],
  ['h', 'Kelompok H', 'ふ berbunyi fu, dengan tiupan lembut.', [
    ['は','ha',[],'はな','Bunga'], ['ひ','hi',[],'ひと','Orang'], ['ふ','fu',['hu'],'ふね','Kapal'], ['へ','he',[],'へや','Kamar'], ['ほ','ho',[],'ほし','Bintang']]],
  ['m', 'Kelompok M', 'Bunyi ma, mi, mu, me, mo.', [
    ['ま','ma',[],'まち','Kota'], ['み','mi',[],'みみ','Telinga'], ['む','mu',[],'むし','Serangga'], ['め','me',[],'め','Mata'], ['も','mo',[],'もり','Hutan']]],
  ['y', 'Kelompok Y', 'Tiga karakter: ya, yu, yo.', [
    ['や','ya',[],'やま','Gunung'], ['ゆ','yu',[],'ゆき','Salju'], ['よ','yo',[],'よる','Malam']]],
  ['r', 'Kelompok R', 'Bunyi r Jepang diucapkan ringan.', [
    ['ら','ra',[],'らくだ','Unta'], ['り','ri',[],'りんご','Apel'], ['る','ru',[],'るす','Tidak di rumah'], ['れ','re',[],'れきし','Sejarah'], ['ろ','ro',[],'ろく','Enam']]],
  ['w', 'Kelompok W', 'Kenali wa dan partikel wo.', [
    ['わ','wa',[],'わたし','Saya'], ['を','wo',['o'],'みずをのむ','Minum air']]],
  ['final-n', 'Penutup N', 'ん adalah bunyi n yang berdiri sendiri.', [
    ['ん','n',['nn'], 'ほん','Buku']]],
];

let order = 0;
export const groups = rows.map(([id, name, description, entries], index) => ({
  id, name, description, index,
  kana: entries.map(([character, romaji, alternatives, example, meaning]) => ({
    id: romaji, character, romaji, alternatives, group: id, order: order++, example, meaning,
    note: romaji === 'wo' ? 'Sebagai partikel, を umumnya dibaca “o”. Jawaban wo dan o diterima.' : null,
  })),
}));
export const kana = groups.flatMap(group => group.kana);
export const kanaById = Object.fromEntries(kana.map(item => [item.id, item]));
export const groupById = Object.fromEntries(groups.map(item => [item.id, item]));
export const statusLabels = { new: 'Baru', learned: 'Dipelajari', mastered: 'Dikuasai' };
