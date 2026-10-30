// Snapshot from the user's RUG timetable for 2026-2027.
// Lectures/tutorials/exams are shown by default. Practicals are only included after a group is selected in Romy Study.
window.ROMY_STUDY_TIMETABLE={
  source:'https://rooster.rug.nl/maat/api/2026-2027/schedule/10b687d8-faf6-4ade-be68-7627281df9f0',
  fetched:'2026-10-30',
  events:[
    // Statistical Signal Processing — lectures
    ...['2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07','2027-01-04','2027-01-11'].flatMap(date=>[
      {course:'ssp',date,start:'09:00',end:'11:00',type:'lecture',title:'College',location:'5616.0125 Collegezaal'},
      {course:'ssp',date,start:'15:00',end:'17:00',type:'lecture',title:'College',location:'5419.0161 Collegezaal'}
    ]),
    // Statistical Signal Processing — computer practical choices
    ...['2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07','2027-01-04','2027-01-11'].flatMap(date=>[
      {course:'ssp',date,start:'13:00',end:'15:00',type:'practical',group:'pc1',title:'Computerpracticum pc1',location:'5419.0142 Computerzaal'},
      {course:'ssp',date,start:'11:00',end:'13:00',type:'practical',group:'pc2',title:'Computerpracticum pc2',location:'5419.0142 Computerzaal'}
    ]),
    {course:'ssp',date:'2027-01-26',start:'11:45',end:'13:45',type:'exam',title:'Tentamen',location:'5263.0226 Exam Hall 4'},

    // Inspanningsfysiologie — lectures/tutorials from timetable snapshot
    {course:'insp',date:'2026-11-09',start:'09:00',end:'11:00',type:'lecture',title:'College',location:'Keuningzaal'},
    {course:'insp',date:'2026-11-12',start:'09:00',end:'11:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-11-18',start:'15:00',end:'17:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-11-19',start:'09:00',end:'11:00',type:'lecture',title:'College',location:'Keuningzaal'},
    {course:'insp',date:'2026-11-24',start:'11:00',end:'13:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-11-25',start:'15:00',end:'17:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-12-03',start:'09:00',end:'11:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-12-09',start:'15:00',end:'17:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-12-10',start:'11:00',end:'13:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2027-01-15',start:'09:00',end:'11:00',type:'lecture',title:'College',location:''},
    {course:'insp',date:'2026-11-18',start:'11:00',end:'13:00',type:'tutorial',title:'Werkcollege',location:'Keuningzaal'},
    {course:'insp',date:'2026-11-23',start:'09:00',end:'11:00',type:'tutorial',title:'Werkcollege',location:''},
    {course:'insp',date:'2026-11-30',start:'11:00',end:'13:00',type:'tutorial',title:'Werkcollege',location:''},
    {course:'insp',date:'2026-12-08',start:'09:00',end:'11:00',type:'tutorial',title:'Werkcollege',location:''},
    {course:'insp',date:'2026-12-15',start:'09:00',end:'11:00',type:'tutorial',title:'Werkcollege',location:''},
    {course:'insp',date:'2027-01-15',start:'15:00',end:'17:00',type:'exam',title:'Digitaal tentamen',location:'Exam Hall 4'},
    {course:'insp',date:'2027-01-22',start:'09:00',end:'10:00',type:'inspection',title:'Tentameninzage',location:'Combizaal'},
    {course:'insp',date:'2027-01-22',start:'10:00',end:'11:00',type:'inspection',title:'Tentameninzage',location:'Combizaal'},
    {course:'insp',date:'2027-01-29',start:'15:00',end:'17:00',type:'resit',title:'Hertentamen',location:'Exam Hall 2'}
  ],
  practicals:{
    insp:{
      '1':[['2026-11-10','09:00','13:00'],['2026-12-04','09:00','13:00'],['2027-01-07','09:00','13:00']],
      '2':[['2026-11-10','13:00','17:00'],['2026-12-07','09:00','13:00'],['2027-01-07','13:00','17:00']],
      '3':[['2026-11-11','09:00','13:00'],['2026-12-07','13:00','17:00'],['2027-01-06','09:00','13:00']],
      '4':[['2026-11-11','13:00','17:00'],['2026-12-08','13:00','17:00'],['2027-01-05','09:00','13:00']],
      '5':[['2026-11-12','13:00','17:00'],['2026-12-09','09:00','13:00'],['2027-01-04','13:00','17:00']],
      '6':[['2026-11-16','09:00','13:00'],['2026-12-10','13:00','17:00'],['2027-01-03','13:00','17:00']],
      '7':[['2026-11-16','13:00','17:00'],['2026-12-14','09:00','13:00'],['2027-01-02','09:00','13:00']],
      '8':[['2026-11-17','09:00','13:00'],['2026-12-14','13:00','17:00'],['2027-01-01','09:00','13:00']],
      '9':[['2026-11-17','13:00','17:00'],['2026-12-15','13:00','17:00'],['2026-12-29','13:00','17:00']],
      '10':[['2026-11-18','09:00','13:00'],['2026-12-16','09:00','13:00'],['2026-12-28','13:00','17:00']],
      '11':[['2026-11-20','09:00','13:00'],['2026-12-16','13:00','17:00'],['2026-12-27','13:00','17:00']],
      '12':[['2026-11-24','13:00','17:00'],['2026-12-17','13:00','17:00'],['2026-12-22','09:00','13:00']],
      '13':[['2026-11-25','09:00','13:00'],['2026-12-18','09:00','13:00'],['2026-12-21','13:00','17:00']],
      '14':[['2026-11-26','09:00','13:00'],['2027-01-04','09:00','13:00'],['2026-12-20','09:00','13:00']],
      '15':[['2026-11-26','13:00','17:00'],['2027-01-04','13:00','17:00'],['2026-12-19','13:00','17:00']],
      '16':[['2026-11-27','09:00','13:00'],['2027-01-05','09:00','13:00'],['2026-12-18','09:00','13:00']],
      '17':[['2026-11-30','13:00','17:00'],['2027-01-05','13:00','17:00'],['2026-12-16','13:00','17:00']],
      '18':[['2026-12-01','13:00','17:00'],['2027-01-06','09:00','13:00'],['2026-12-15','09:00','13:00']],
      '19':[['2026-12-02','09:00','13:00'],['2027-01-07','09:00','13:00'],['2026-12-14','09:00','13:00']],
      '20':[['2026-12-03','13:00','17:00'],['2027-01-07','13:00','17:00'],['2026-12-13','09:00','13:00']]
    }
  }
};