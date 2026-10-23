export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  time: string;
  summary: string;
  body: string;
}

export const newsArticles: NewsArticle[] = [
  {
    id: 'swe-lead-group-a',
    title: 'Software Engineering take control of Group A',
    category: 'Match report',
    time: 'Today',
    summary: 'SWE lead Information Technology 1-0 in the Matchday 2 live game at the Institute of Technology Ground.',
    body: 'Software Engineering are in front against Information Technology in the Super Cup group stage. The live lead, added to their Matchday 1 win over Electrical & Computer Engineering, puts SWE clear at the top of Group A. Computer Science and ECE meet later today.',
  },
  {
    id: 'medicine-perfect',
    title: 'Medicine stay perfect in Group D',
    category: 'Group D',
    time: 'Today',
    summary: 'Medicine beat Midwifery 2-0 and remain on six points from two games.',
    body: 'Medicine followed their 3-0 opening win over Medical Laboratory with a 2-0 result against Midwifery at Health Campus Field. Nursing and Midwifery shared points on Matchday 1, so Medicine are the only side in the group with a perfect record.',
  },
  {
    id: 'sport-science-three',
    title: 'Sport Science score three against Biology',
    category: 'Group E',
    time: 'Today',
    summary: 'A 3-1 win moves Sport Science to the top of the natural sciences group.',
    body: 'Sport Science beat Biology 3-1 on Matchday 2 at DDU Main Pitch. Mathematics still have a Matchday 2 game against Chemistry, while Sport Science sit on four points after drawing Chemistry on the opening day.',
  },
  {
    id: 'matchday-three',
    title: 'Matchday 3 closes the group stage on October 31',
    category: 'Fixtures',
    time: 'This week',
    summary: 'Every department plays its last group game on October 31. The top two in each group advance.',
    body: 'The Dire Dawa University Super Cup group stage finishes on October 31. Each group has four departments, and each department plays the other three once. The top two in every group advance. Kickoffs are spread across DDU Main Pitch, Sabian Campus Pitch, the Institute of Technology Ground, and Health Campus Field.',
  },
  {
    id: 'civil-engineering-pace',
    title: 'Civil Engineering set the pace in Group B',
    category: 'Group B',
    time: 'Today',
    summary: 'Civil Engineering have two wins from two after beating Architecture 2-1.',
    body: 'Civil Engineering beat Chemical Engineering 1-0 and then Architecture 2-1. Mechanical Engineering opened with a 3-1 win over Architecture and still have Chemical Engineering to play on Matchday 2.',
  },
];

export function getNewsArticle(id: string) {
  return newsArticles.find((article) => article.id === id);
}
