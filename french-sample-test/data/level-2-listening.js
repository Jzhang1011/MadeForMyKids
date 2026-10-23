/* Level 2 (Intermediate Low target) — Listening: short messages, announcements and stories. */
window.FST_DATA = window.FST_DATA || {};
window.FST_DATA['listening-2'] = {
  level: 2,
  practice: { say: 'Salut, c’est Marie. Je suis à la boulangerie. Tu veux un croissant ?', q: 'Where is Marie?', options: ['At school', 'At the bakery', 'At home', 'At the park'], answer: 1 },
  items: [
    { say: 'Allô, maman ? Je suis chez Léo. On fait nos devoirs ensemble. Je rentre à six heures.', q: 'What time will the speaker get home?', options: ['4:00', '5:00', '6:00', '7:00'], answer: 2 },
    { say: 'Allô, maman ? Je suis chez Léo. On fait nos devoirs ensemble. Je rentre à six heures.', q: 'What are the kids doing?', options: ['Playing video games', 'Doing homework', 'Watching TV', 'Eating dinner'], answer: 1 },
    { say: 'Attention, s’il vous plaît. Le train pour Lyon part du quai numéro trois.', q: 'Which platform does the train leave from?', options: ['1', '2', '3', '13'], answer: 2 },
    { say: 'Demain, il va faire très chaud. N’oubliez pas votre chapeau et de l’eau.', q: 'What advice is given?', options: ['Bring an umbrella', 'Bring a hat and water', 'Wear a coat', 'Stay inside'], answer: 1 },
    { say: 'Mon chien est malade. Je vais chez le vétérinaire cet après-midi.', q: 'Where is the speaker going?', options: ['To the doctor', 'To the vet', 'To the pet store', 'To the park'], answer: 1 },
    { say: 'Pour la fête, nous avons besoin de jus de fruits, de gâteaux et de ballons.', q: 'What is NOT on the list?', options: ['Fruit juice', 'Cakes', 'Balloons', 'Candles'], answer: 3 },
    { say: 'Bonjour les élèves. Aujourd’hui, pas de récréation dehors : il pleut trop.', q: 'Why is recess inside?', options: ['It is too cold', 'It is raining too much', 'The playground is closed', 'There is a test'], answer: 1 },
    { say: 'Ma cousine habite au Québec. Là-bas, en hiver, il fait moins vingt degrés !', q: 'What is surprising about Québec?', options: ['It is very hot', 'It is very cold in winter', 'It rains all year', 'It never snows'], answer: 1 },
    { say: 'Je voudrais un sandwich au jambon et une limonade, s’il vous plaît.', q: 'What does the customer order?', options: ['A cheese sandwich and water', 'A ham sandwich and lemonade', 'A salad and juice', 'A pizza and soda'], answer: 1 },
    { say: 'Le magasin ferme dans dix minutes. Merci de vous diriger vers les caisses.', q: 'What is happening?', options: ['The store is opening', 'The store closes in ten minutes', 'There is a sale', 'A child is lost'], answer: 1 },
    { say: 'Hier soir, mon petit frère a trouvé une grenouille dans le jardin. Il l’a mise dans une boîte pour la montrer à papa.', q: 'What did the little brother find?', options: ['A frog', 'A bird', 'A snake', 'A turtle'], answer: 0 },
    { say: 'Hier soir, mon petit frère a trouvé une grenouille dans le jardin. Il l’a mise dans une boîte pour la montrer à papa.', q: 'Why did he put it in a box?', options: ['To keep it as a pet', 'To show it to dad', 'To take it to school', 'To set it free'], answer: 1 },
    { say: 'Ce week-end, je vais chez mes grands-parents. Nous allons faire une promenade en forêt.', q: 'What will they do this weekend?', options: ['Go to the beach', 'Take a walk in the forest', 'Go to the movies', 'Cook together'], answer: 1 },
    { say: 'N’oublie pas : ton cours de piano est jeudi à cinq heures.', q: 'When is the piano lesson?', options: ['Tuesday at 4', 'Thursday at 5', 'Friday at 5', 'Thursday at 3'], answer: 1 },
    { say: 'Le bus scolaire est en retard ce matin. Il arrive dans vingt minutes.', q: 'What is the problem?', options: ['The bus is late', 'The bus is full', 'There is no school', 'The bus broke down'], answer: 0 },
    { say: 'Ma meilleure amie s’appelle Zoé. Elle est drôle et gentille, et elle adore la danse.', q: 'What does Zoé love?', options: ['Singing', 'Dancing', 'Drawing', 'Reading'], answer: 1 },
    { say: 'Je cherche mon manteau bleu. Je pense qu’il est dans la voiture.', q: 'Where does the speaker think the coat is?', options: ['At school', 'In the car', 'In the closet', 'At a friend’s'], answer: 1 },
    { say: 'Au zoo, nous avons vu des lions, des girafes et un bébé éléphant.', q: 'Which baby animal did they see?', options: ['A lion', 'A giraffe', 'An elephant', 'A monkey'], answer: 2 },
    { say: 'Aujourd’hui, à la cantine, il y a du poisson avec des haricots verts.', q: 'What is for lunch?', options: ['Chicken and rice', 'Fish and green beans', 'Pasta', 'Pizza and salad'], answer: 1 },
    { say: 'Le musée est ouvert tous les jours sauf le mardi.', q: 'When is the museum closed?', options: ['Monday', 'Tuesday', 'Sunday', 'Never'], answer: 1 },
    { say: 'Il était une fois une petite souris qui adorait le fromage. Un jour, elle a trouvé un énorme morceau dans la cuisine.', q: 'Where did the mouse find the cheese?', options: ['In the garden', 'In the kitchen', 'In the forest', 'At the market'], answer: 1 },
    { say: 'Pour mon anniversaire, je voudrais un vélo ou un nouveau jeu de société.', q: 'What does the speaker want for a birthday?', options: ['A bike or a board game', 'A phone', 'A puppy', 'Books'], answer: 0 },
    { say: 'Mets ton écharpe, il y a beaucoup de vent dehors.', q: 'Why should you wear a scarf?', options: ['It is raining', 'It is very windy', 'It is snowing', 'It is foggy'], answer: 1 },
    { say: 'Ma tante est infirmière. Elle travaille la nuit à l’hôpital.', q: 'When does the aunt work?', options: ['In the morning', 'In the afternoon', 'At night', 'On weekends only'], answer: 2 },
    { say: 'Les enfants, rangez vos livres et prenez une feuille. C’est l’heure du petit test.', q: 'What is about to happen?', options: ['Lunch', 'A short test', 'Recess', 'A field trip'], answer: 1 },
    { say: 'Le chat de la voisine est monté dans l’arbre et il ne peut pas descendre.', q: 'What is the cat’s problem?', options: ['It is lost', 'It is stuck in a tree', 'It is hungry', 'It is hurt'], answer: 1 },
    { say: 'Je préfère l’été parce que je peux nager tous les jours.', q: 'Why does the speaker prefer summer?', options: ['No school', 'Swimming every day', 'Ice cream', 'Vacations abroad'], answer: 1 },
    { say: 'Samedi matin, je fais les courses avec papa, et l’après-midi, je joue au basket.', q: 'What happens Saturday afternoon?', options: ['Shopping', 'Basketball', 'Homework', 'Swimming'], answer: 1 },
    { say: 'Ce soir, on mange des crêpes ! Tu peux acheter des œufs et du lait ?', q: 'What should be bought?', options: ['Eggs and milk', 'Flour and sugar', 'Butter and jam', 'Bread and cheese'], answer: 0 },
    { say: 'Désolé, je ne peux pas venir à ta fête. Je suis chez mon père ce week-end.', q: 'Why can’t the speaker come?', options: ['He is sick', 'He is at his dad’s this weekend', 'He has homework', 'He is on vacation'], answer: 1 }
  ]
};
