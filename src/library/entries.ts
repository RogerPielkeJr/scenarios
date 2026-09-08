/**
 * The library: what Roger Pielke Jr. has written on emissions scenarios at
 * The Honest Broker.
 *
 * Every entry points at a post on rogerpielkejr.substack.com, carries the
 * date it went out, and says in one line what the reader will find there.
 * The cover images come from Substack's own CDN at the width a card needs,
 * so the page holds no copies and never drifts from the posts themselves.
 */

export interface LibraryEntry {
  /** The post's slug on Substack, which also keys the entry. */
  slug: string;
  title: string;
  /** ISO date the post went out. */
  date: string;
  url: string;
  /** Cover image, at card width. */
  image: string;
  /** What a reader finds in the post, in a sentence or two. */
  gloss: string;
}

export interface LibrarySection {
  id: string;
  title: string;
  /** Why these posts sit together, and what reading them gives the reader. */
  note: string;
  entries: LibraryEntry[];
}

const CDN = 'https://substackcdn.com/image/fetch';
const POST = 'https://rogerpielkejr.substack.com/p';

export const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    id: 'making-sense',
    title: 'Making sense of scenarios',
    note: 'Start here. A three-part series on how the scenarios get built and who '
      + 'builds them, plus the short course written before the IPCC Synthesis Report.',
    entries: [
      {
        slug: 'constructing-climate-catastrophism',
        title: 'Constructing Climate Catastrophism',
        date: '2025-04-28',
        url: `${POST}/constructing-climate-catastrophism`,
        image: `${CDN}/$s_!xUxQ!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '1328ae87-1001-44cc-9ecb-4843560304bb_480x720.png',
        gloss: 'Part one of the series. How the sausage gets made: a few dozen researchers '
          + 'decide which futures the field prioritises, thousands of papers follow, and '
          + 'almost nothing holds that choice to account.',
      },
      {
        slug: 'the-future-is-already-here-somewhere',
        title: 'The Future is Already Here Somewhere',
        date: '2025-05-14',
        url: `${POST}/the-future-is-already-here-somewhere`,
        image: `${CDN}/$s_!lt4N!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + 'b0c66764-dbaf-4d25-b3bb-71ba83348394_749x934.png',
        gloss: 'Part two. The complexity hides a short chain: the coal a scenario '
          + 'assumes for 2100 tracks its emissions, and cumulative emissions track its 2100 '
          + 'temperature. The energy mix decides most of the answer.',
      },
      {
        slug: 'what-is-a-worst-case-climate-scenario',
        title: 'What is a "Worst Case" Climate Scenario?',
        date: '2025-06-04',
        url: `${POST}/what-is-a-worst-case-climate-scenario`,
        image: `${CDN}/$s_!keDz!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '8a49f515-c491-411c-83f9-f894aa68e1d6_540x468.jpeg',
        gloss: 'Part three, on RCP8.5. Not merely unlikely: its emissions trajectory has '
          + 'already parted company with what the world emits, and the gap keeps widening.',
      },
      {
        slug: 'a-primer-on-implausible-climate-scenarios',
        title: 'A Primer on Implausible Climate Scenarios',
        date: '2023-03-17',
        url: `${POST}/a-primer-on-implausible-climate-scenarios`,
        image: 'https://substack-post-media.s3.amazonaws.com/public/images/'
          + '3c13d9e7-1e44-45fc-a303-56a2024c1f6b_393x171.png',
        gloss: 'The short course, written before the IPCC Synthesis Report landed. What the '
          + 'work with Matthew Burgess and Justin Ritchie found: the scenarios guiding the '
          + 'IPCC exceed observations by a wide margin, today and out to 2100.',
      },
    ],
  },
  {
    id: 'drift',
    title: 'How the scenarios drifted',
    note: 'The case built over six years, from the first paper showing the divergence to '
      + 'the councils still planning around it.',
    entries: [
      {
        slug: 'the-unstoppable-momentum-of-outdated',
        title: 'The Unstoppable Momentum of Outdated Science',
        date: '2020-11-30',
        url: `${POST}/the-unstoppable-momentum-of-outdated`,
        image: `${CDN}/$s_!iBEL!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com'
          + '%2Fpublic%2Fimages%2F8645a4d3-0412-4bfb-a72c-c02b5e904e64_1736x1073.png',
        gloss: 'Breast cancer research ran on a misidentified cell line for years after '
          + 'someone caught the error. Climate research faced the same problem in 2020: '
          + 'scenarios already diverging from the world, with the literature still building '
          + 'on them.',
      },
      {
        slug: 'thou-shalt-use-rcp85',
        title: 'Thou Shalt Use RCP8.5',
        date: '2023-10-09',
        url: `${POST}/thou-shalt-use-rcp85`,
        image: `${CDN}/$s_!6n9c!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '259337c1-f215-41cf-a546-c4ae385f4029_550x720.png',
        gloss: 'The Dutch government adopted RCP8.5 as a plausible scenario for national '
          + 'planning in 2023. On what happens when a government writes an outdated scenario '
          + 'into official guidance and the field says nothing.',
      },
      {
        slug: 'how-climate-science-lost-its-way',
        title: 'How Climate Science Lost Its Way on Scenarios',
        date: '2026-05-13',
        url: `${POST}/how-climate-science-lost-its-way`,
        image: `${CDN}/$s_!VEPp!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '4f2ff88c-80f6-48fc-a58f-096078454438_960x720.png',
        gloss: 'A technically perfect weather forecast will not help your picnic if it '
          + 'forecasts Mars. The 2021 deep dive, summarised: how the projections came to '
          + 'describe a world other than the one we live in.',
      },
      {
        slug: 'the-real-costs-of-implausible-scenarios',
        title: 'The Real Costs of Implausible Scenarios',
        date: '2026-07-09',
        url: `${POST}/the-real-costs-of-implausible-scenarios`,
        image: `${CDN}/$s_!3UaR!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + 'db6df74d-93e1-4224-80cf-484d406476ba_1448x1086.png',
        gloss: 'New Zealand’s climate minister asked every council to stop treating '
          + 'RCP8.5 as the central case. Kapiti Coast homeowners live with hazard notations '
          + 'on their property files that trace back to it.',
      },
    ],
  },
  {
    id: 'cmip7',
    title: 'The turn to CMIP7',
    note: 'The seven scenarios this tool draws behind your own, and how they came to '
      + 'replace the set that went before.',
    entries: [
      {
        slug: 'big-news-climate-scenarios-are-getting',
        title: 'Big News: Climate Scenarios are Getting Back on Track',
        date: '2023-07-29',
        url: `${POST}/big-news-climate-scenarios-are-getting`,
        image: `${CDN}/$s_!uZto!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '2f678916-1723-4f7d-8a4e-e07406478717_1093x1110.jpeg',
        gloss: 'The CMIP7 ScenarioMIP steering committee met at Reading and set out how the '
          + 'next generation of scenarios would work. The correctives it identified, and the '
          + 'problems it left standing.',
      },
      {
        slug: 'rcp85-is-officially-dead',
        title: 'RCP8.5 is Officially Dead',
        date: '2026-04-29',
        url: `${POST}/rcp85-is-officially-dead`,
        image: `${CDN}/$s_!F7sz!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '4ca5d6d2-2dc5-41b6-9f3b-80a07f39bed2_1254x1254.png',
        gloss: 'The news, broken here: CMIP7 dropped RCP8.5, SSP5-8.5 and SSP3-7.0 from the '
          + 'official set. Those three anchored fifteen years of research, assessment, '
          + 'regulation and financial standards.',
      },
      {
        slug: 'no-rcp85-did-not-become-implausible',
        title: 'No, RCP8.5 Did Not Become Implausible Because of Climate Policy',
        date: '2026-05-18',
        url: `${POST}/no-rcp85-did-not-become-implausible`,
        image: `${CDN}/$s_!R884!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '824d13fe-a3d9-401a-9303-280eb5e36fb5_720x720.png',
        gloss: 'A boy who grows a foot between 12 and 16 will not stand nine feet tall at 28, '
          + 'and nobody averted that. RCP8.5 never described a plausible path, so climate '
          + 'policy cannot claim the credit for its retirement.',
      },
      {
        slug: 'the-retreat-continues',
        title: 'The Retreat Continues',
        date: '2026-07-15',
        url: `${POST}/the-retreat-continues`,
        image: `${CDN}/$s_!95om!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '6694e94c-1a17-4633-8952-219506e9a023_576x720.png',
        gloss: 'The final CMIP7 scenarios cut cumulative fossil CO2 again. The highest '
          + 'path falls from SSP5-8.5’s 7,380 Gt to 3,438 Gt, and the current-policy '
          + 'path to 2,528 Gt. The set that survived that cut is the seven this tool '
          + 'measures every scenario against.',
      },
    ],
  },
  {
    id: 'assumptions',
    title: 'Inside the assumptions',
    note: 'Four posts on the quantities the sliders move: how far the projections have '
      + 'come down, and how much any single projection can carry.',
    entries: [
      {
        slug: 'take-the-under',
        title: 'Take the Under',
        date: '2024-10-28',
        url: `${POST}/take-the-under`,
        image: `${CDN}/$s_!Wc4x!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '21d3ab59-360c-48f9-a780-2e6db86c421b_645x662.png',
        gloss: 'Population and GDP projections keep coming down, and the demographers keep '
          + 'missing on the high side. What erring low on both does to the current-policy '
          + 'temperature projections around 2.7 °C.',
      },
      {
        slug: 'what-demographic-prediction-can-and',
        title: 'What Demographic Prediction Can and Cannot Achieve',
        date: '2026-05-28',
        url: `${POST}/what-demographic-prediction-can-and`,
        image: `${CDN}/$s_!_Kpy!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + '7af8984a-7579-492c-a138-c59a04640cef_720x720.png',
        gloss: 'A preprint with Lo Piano, Kuc-Czarnecka and Saltelli. The choice of model '
          + 'drives nearly all the variance in long-run population projections; fertility '
          + 'assumptions account for around 2% of it.',
      },
      {
        slug: 'does-peak-population-mean-peak-energy',
        title: 'Does Peak Population Mean Peak Energy?',
        date: '2026-02-23',
        url: `${POST}/does-peak-population-mean-peak-energy`,
        image: `${CDN}/$s_!0-9I!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + 'f003ebe0-b68e-4250-9c0f-c907acb9755e_688x403.png',
        gloss: 'Probably not. The world holds no rich low-energy countries and no poor '
          + 'high-energy ones, so a population peak arriving sooner than expected does not '
          + 'bring an energy peak with it.',
      },
      {
        slug: 'watch-those-assumptions',
        title: 'Watch Those Assumptions!',
        date: '2026-01-22',
        url: `${POST}/watch-those-assumptions`,
        image: `${CDN}/$s_!Jkjq!,w_600,c_limit,f_auto,q_auto:good,fl_progressive:steep/`
          + 'https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F'
          + 'd233b250-6aef-461a-94b3-78dfd97c7e8c_691x460.png',
        gloss: 'Five figures from the IEA World Energy Outlook 2025, and the assumptions '
          + 'buried underneath them — the same assumptions, in the same places, that '
          + 'the sliders here ask you to set.',
      },
    ],
  },
];

/** Every entry, newest first. */
export function libraryEntries(): LibraryEntry[] {
  return LIBRARY_SECTIONS.flatMap((section) => section.entries)
    .sort((a, b) => b.date.localeCompare(a.date));
}
