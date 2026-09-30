// Genesis as a memory palace: four movements, five objects each, walked clockwise.
// Every one of the 50 chapters belongs to exactly one station. Verses are KJV (public domain).

export const BOOK = {
  id: 'genesis',
  name: 'Genesis',
  room: 1,
  chapters: 50,
  subtitle: 'The book of beginnings',
};

export const ZONES = [
  {
    numeral: 'I', name: 'Beginnings', chapters: [1, 11], color: '#5a6cc0',
    theme: 'A good world made, marred and scattered.',
  },
  {
    numeral: 'II', name: 'Promise', chapters: [12, 24], color: '#d69a32',
    theme: 'God calls one family to bless every family on earth.',
  },
  {
    numeral: 'III', name: 'Struggle', chapters: [25, 36], color: '#c4573c',
    theme: 'Jacob the grasper wrestles his way into the blessing.',
  },
  {
    numeral: 'IV', name: 'Providence', chapters: [37, 50], color: '#2f9487',
    theme: 'What the brothers meant for evil, God meant for good.',
  },
];

export const STATIONS = [
  // I · Beginnings
  {
    id: 'creation', zone: 0, chapters: [1, 2], title: 'The Seven-Rayed Sun',
    summary: 'God speaks light into darkness and shapes a good world in six days, then rests on the seventh. Humans are made in his image and placed in a garden to tend it.',
    symbol: 'Seven rays for seven days. The waves beneath are the formless deep that God begins with.',
    verse: { ref: 'Genesis 1:31', text: 'And God saw every thing that he had made, and, behold, it was very good.' },
    then: 'The world is good. Then the humans reach for the one thing that was not theirs.',
  },
  {
    id: 'fall', zone: 0, chapters: [3, 3], title: 'The Tree and the Serpent',
    summary: 'The serpent questions God’s word. The woman and the man eat from the forbidden tree, hide in shame, and are sent out of the garden — with a promise that her offspring will crush the serpent’s head.',
    symbol: 'One red fruit on a dark tree: a single choice that changes everything. The gold serpent coils where the trouble starts.',
    verse: { ref: 'Genesis 3:9', text: 'And the LORD God called unto Adam, and said unto him, Where art thou?' },
    then: 'Outside the garden, the brokenness spreads to the next generation.',
  },
  {
    id: 'altars', zone: 0, chapters: [4, 5], title: 'Two Altars',
    summary: 'Cain and Abel bring offerings. God accepts Abel’s; Cain, jealous, kills his brother. The family line that follows runs from Adam to Noah, and its refrain is “and he died.”',
    symbol: 'One smoke rises straight to heaven, the other sinks back to earth. Two brothers, two hearts. The small red flower is the blood that cries from the ground.',
    verse: { ref: 'Genesis 4:9', text: 'And the LORD said unto Cain, Where is Abel thy brother? And he said, I know not: Am I my brother’s keeper?' },
    then: 'Violence fills the earth, and God is grieved that he made humankind.',
  },
  {
    id: 'ark', zone: 0, chapters: [6, 9], title: 'The Ark and the Bow',
    summary: 'God floods the violent earth but saves Noah, his family and the animals in an ark. The dove returns with an olive leaf. God promises never to flood the earth again and sets his bow in the clouds.',
    symbol: 'The ark is rescue through judgment. The rainbow uses the same word as a warrior’s bow — God hangs up his weapon as a sign of peace.',
    verse: { ref: 'Genesis 9:13', text: 'I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.' },
    then: 'Noah’s descendants fill the earth — until they gather to make a name for themselves.',
  },
  {
    id: 'babel', zone: 0, chapters: [10, 11], title: 'The Unfinished Tower',
    summary: 'The nations spread out from Noah’s sons. At Babel, people build a tower to reach heaven and make a name for themselves. God confuses their language and scatters them. The chapter ends with one man: Abram.',
    symbol: 'A tower that never reaches heaven, its top broken and its bricks scattered across the floor. Human pride, unfinished.',
    verse: { ref: 'Genesis 11:4', text: 'Go to, let us build us a city and a tower, whose top may reach unto heaven; and let us make us a name…' },
    then: 'The world is scattered. God’s answer is not a tower but a family.',
  },

  // II · Promise
  {
    id: 'tent', zone: 1, chapters: [12, 14], title: 'The Tent and the Staff',
    summary: 'God calls Abram to leave his homeland for a land he has never seen, promising to make his name great — the very thing Babel grabbed for — and to bless all families of the earth through him. Abram goes, lives in tents, and rescues his nephew Lot.',
    symbol: 'A traveller’s tent and walking staff: Abram lives by promise, always on the move, never settled.',
    verse: { ref: 'Genesis 12:1', text: 'Get thee out of thy country, and from thy kindred, and from thy father’s house, unto a land that I will shew thee.' },
    then: 'Years pass, and still there is no child. God takes Abram outside at night.',
  },
  {
    id: 'stars', zone: 1, chapters: [15, 17], title: 'Count the Stars',
    summary: 'Childless Abram is told to count the stars: so shall his offspring be. He believes. Sarai gives Hagar to Abram and Ishmael is born. God renames them Abraham and Sarah and gives circumcision as the sign of the covenant.',
    symbol: 'A window full of stars: a promise too big to count, believed in the dark.',
    verse: { ref: 'Genesis 15:6', text: 'And he believed in the LORD; and he counted it to him for righteousness.' },
    then: 'Three visitors arrive. Sarah will laugh — and Sodom will burn.',
  },
  {
    id: 'salt', zone: 1, chapters: [18, 19], title: 'The Pillar of Salt',
    summary: 'Three visitors promise Sarah a son, and she laughs. Abraham pleads with God for Sodom. The city is destroyed; Lot escapes, but his wife looks back and becomes a pillar of salt.',
    symbol: 'A white figure turned toward a burning city: the danger of looking back.',
    verse: { ref: 'Genesis 19:26', text: 'But his wife looked back from behind him, and she became a pillar of salt.' },
    then: 'At last the promised son is born — and then God asks for him back.',
  },
  {
    id: 'ram', zone: 1, chapters: [20, 22], title: 'The Ram in the Thicket',
    summary: 'Isaac — “he laughs” — is born. Hagar and Ishmael are sent away, but God cares for them. Then God tests Abraham: offer Isaac on Mount Moriah. At the last moment God stops him and provides a ram instead.',
    symbol: 'A ram caught by its horns beside the altar: God provides the substitute.',
    verse: { ref: 'Genesis 22:8', text: 'My son, God will provide himself a lamb for a burnt offering.' },
    then: 'Sarah dies, and Abraham sends his servant to find a wife for Isaac.',
  },
  {
    id: 'well', zone: 1, chapters: [23, 24], title: 'The Jar at the Well',
    summary: 'Abraham buys a cave to bury Sarah — his first piece of the promised land. His servant travels with ten camels and prays at a well. Rebekah waters the camels and becomes Isaac’s wife.',
    symbol: 'A water jar and a camel at the well: a prayer answered, a bride found.',
    verse: { ref: 'Genesis 24:27', text: 'I being in the way, the LORD led me…' },
    then: 'Rebekah bears twins who fight before they are even born.',
  },

  // III · Struggle
  {
    id: 'stew', zone: 2, chapters: [25, 26], title: 'The Bowl of Red Stew',
    summary: 'Abraham dies. Rebekah’s twins struggle in the womb. Esau the hunter trades his birthright to Jacob for a bowl of red stew. Isaac repeats his father’s mistakes but receives the same promise.',
    symbol: 'A bowl of red stew beside a hunter’s bow: a future sold for one meal.',
    verse: { ref: 'Genesis 25:34', text: '…thus Esau despised his birthright.' },
    then: 'Jacob has the birthright. Now he wants the blessing too.',
  },
  {
    id: 'hands', zone: 2, chapters: [27, 27], title: 'The Hairy Hand',
    summary: 'Rebekah and Jacob deceive blind Isaac: goatskins on Jacob’s hands make him feel like Esau. Isaac blesses the wrong son. Esau vows to kill Jacob, who flees.',
    symbol: 'A hand wrapped in goatskin: a blessing stolen by disguise.',
    verse: { ref: 'Genesis 27:22', text: 'The voice is Jacob’s voice, but the hands are the hands of Esau.' },
    then: 'Alone on the road, with a stone for a pillow, Jacob dreams.',
  },
  {
    id: 'ladder', zone: 2, chapters: [28, 28], title: 'The Ladder to Heaven',
    summary: 'On the run, Jacob sleeps on a stone and dreams of a stairway to heaven with angels going up and down. God gives him the promise made to Abraham. Jacob names the place Bethel, “house of God.”',
    symbol: 'A golden ladder joining earth and heaven: God meets the runaway.',
    verse: { ref: 'Genesis 28:16', text: 'Surely the LORD is in this place; and I knew it not.' },
    cam: { dist: 8.4, height: 3.2, target: 1.9 },
    then: 'Jacob reaches his uncle Laban — and the trickster gets tricked.',
  },
  {
    id: 'veil', zone: 2, chapters: [29, 31], title: 'The Wedding Veil',
    summary: 'Jacob works seven years for Rachel, but Laban slips Leah under the veil instead. Jacob works seven more. Eleven sons and a daughter are born amid rivalry; Jacob’s flocks grow, and he finally escapes Laban.',
    symbol: 'A veil hiding the wrong bride: the deceiver deceived. The speckled sheep are the flocks Jacob wins.',
    verse: { ref: 'Genesis 29:25', text: '…behold, it was Leah: and he said to Laban, What is this thou hast done unto me?' },
    then: 'On the way home to face Esau, Jacob is ambushed in the night.',
  },
  {
    id: 'wrestle', zone: 2, chapters: [32, 36], title: 'Wrestling till Dawn',
    summary: 'Afraid of Esau, Jacob wrestles a mysterious man all night and will not let go without a blessing. He is renamed Israel and leaves limping. Esau forgives him. Rachel dies giving birth to Benjamin, the twelfth son.',
    symbol: 'Two figures locked together against the dawn: Jacob finally clings to God instead of grasping.',
    verse: { ref: 'Genesis 32:26', text: 'I will not let thee go, except thou bless me.' },
    then: 'Israel has twelve sons — but he loves one more than all the others.',
  },

  // IV · Providence
  {
    id: 'coat', zone: 3, chapters: [37, 38], title: 'The Coat of Many Colors',
    summary: 'Jacob gives Joseph a special coat. Joseph dreams that his brothers will bow to him. They throw him into a pit, sell him to traders bound for Egypt, and show their father the coat dipped in blood. (Chapter 38 turns aside to Judah and Tamar.)',
    symbol: 'A coat of every color, stained red at the hem: favoritism, envy and a father’s grief.',
    verse: { ref: 'Genesis 37:3', text: 'Now Israel loved Joseph more than all his children… and he made him a coat of many colours.' },
    then: 'Sold as a slave, Joseph rises — and falls again.',
  },
  {
    id: 'prison', zone: 3, chapters: [39, 40], title: 'The Cup and the Basket',
    summary: 'Joseph serves Potiphar faithfully, is falsely accused and thrown into prison. There he explains the dreams of Pharaoh’s cupbearer and baker: one will be restored, one executed. The cupbearer forgets him.',
    symbol: 'A cup and a basket beneath a barred window: two dreams, two fates — and God with Joseph in the dark.',
    verse: { ref: 'Genesis 39:21', text: 'But the LORD was with Joseph, and shewed him mercy…' },
    then: 'Two years later, Pharaoh has a dream no one can explain.',
  },
  {
    id: 'sheaves', zone: 3, chapters: [41, 41], title: 'Seven Sheaves',
    summary: 'Pharaoh dreams of seven fat cows and seven thin ones, seven full ears of grain and seven withered. Joseph explains: seven years of plenty, then seven of famine. Pharaoh puts him in charge of Egypt to store up grain.',
    symbol: 'Seven full sheaves in front of seven withered stalks: plenty stored up against the famine.',
    verse: { ref: 'Genesis 41:16', text: 'It is not in me: God shall give Pharaoh an answer of peace.' },
    then: 'The famine reaches Canaan. Joseph’s brothers come to Egypt to buy grain.',
  },
  {
    id: 'cup', zone: 3, chapters: [42, 45], title: 'The Silver Cup',
    summary: 'The brothers bow before Joseph without recognizing him. He tests them, then hides his silver cup in Benjamin’s sack. Judah offers himself in Benjamin’s place. Joseph weeps and reveals who he is.',
    symbol: 'A silver cup hidden in a grain sack: the test that shows the brothers have changed.',
    verse: { ref: 'Genesis 45:4', text: 'I am Joseph your brother, whom ye sold into Egypt.' },
    then: 'The whole family moves down to Egypt.',
  },
  {
    id: 'coffin', zone: 3, chapters: [46, 50], title: 'The Coffin in Egypt',
    summary: 'Jacob brings seventy family members to Egypt. Before he dies he blesses his twelve sons — kings will come from Judah. Joseph forgives his brothers. Genesis ends with Joseph in a coffin in Egypt, his bones waiting to go home.',
    symbol: 'A coffin far from home: the family is safe, but the promise isn’t finished. The door behind it leads to Exodus.',
    verse: { ref: 'Genesis 50:20', text: 'But as for you, ye thought evil against me; but God meant it unto good…' },
    then: 'Genesis ends in Egypt. The story continues in the next room: Exodus.',
  },
];

export const chapterLabel = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);

export function stationForChapter(ch) {
  return STATIONS.findIndex((s) => ch >= s.chapters[0] && ch <= s.chapters[1]);
}
