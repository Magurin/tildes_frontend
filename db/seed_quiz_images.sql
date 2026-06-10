-- Семантические домены (Rapid Word Collection, упрощённо) для викторины.
-- Применить в Supabase SQL Editor.

-- 1. Домены для существующих картинок.
update quiz_images set category = 'Природа'   where image_path in ('/quiz/sun.svg','/quiz/moon.svg','/quiz/water.svg','/quiz/fire.svg','/quiz/tree.svg');
update quiz_images set category = 'Животные'  where image_path in ('/quiz/bird.svg','/quiz/dog.svg','/quiz/fish.svg');
update quiz_images set category = 'Тело'      where image_path in ('/quiz/eye.svg','/quiz/hand.svg');
update quiz_images set category = 'Быт'       where image_path in ('/quiz/house.svg','/quiz/boat.svg');

-- 2. Новые картинки (файлы добавлены в public/quiz/).
insert into quiz_images (image_path, category, label_hint, sort_order) values
  ('/quiz/ear.svg',      'Тело',     'ухо',     13),
  ('/quiz/mouth.svg',    'Тело',     'рот',     14),
  ('/quiz/person.svg',   'Люди',     'человек', 15),
  ('/quiz/child.svg',    'Люди',     'ребёнок', 16),
  ('/quiz/cat.svg',      'Животные', 'кот',     17),
  ('/quiz/horse.svg',    'Животные', 'лошадь',  18),
  ('/quiz/mountain.svg', 'Природа',  'гора',    19),
  ('/quiz/rain.svg',     'Природа',  'дождь',   20),
  ('/quiz/cloud.svg',    'Природа',  'облако',  21),
  ('/quiz/star.svg',     'Природа',  'звезда',  22),
  ('/quiz/bread.svg',    'Еда',      'хлеб',    23),
  ('/quiz/apple.svg',    'Еда',      'яблоко',  24)
on conflict do nothing;
