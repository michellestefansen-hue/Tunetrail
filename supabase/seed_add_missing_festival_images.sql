-- Fill in missing image_url for 20 festivals that had none, sourced from
-- each festival's own official website (og:image / social share image).

update festivals set image_url = 'https://amphi-festival.de/wp-content/uploads/sites/2/2026/07/260716-Amphi-2026_SoldOut.jpg' where slug = 'amphi-festival';
update festivals set image_url = 'https://assets.awakenings.com/images/transforms/_1200x630_crop_center-center_none/awakenings_website_facebook.png' where slug = 'awakenings-upclose';
update festivals set image_url = 'https://delta-festival.com/wp-content/uploads/2026/02/opengraph_delta2026.jpg' where slug = 'delta-festival';
update festivals set image_url = 'https://www.datocms-assets.com/146604/1740145522-dgtlhrsaturday2023-byinfo-kirstenvansanten-nl-179.jpg?auto=format&fit=max&w=1200' where slug = 'dgtl-festival-amsterdam';
update festivals set image_url = 'https://dynamo-metalfest.nl/wp-content/uploads/2025/11/Untitled-1.jpg' where slug = 'dynamo-metalfest';
update festivals set image_url = 'https://www.extrema.be/media/cache/ogimage/upload/media/default/234c/01/30eb38fb207b78768c6d82fd6730e309ae472638.jpg' where slug = 'extrema-outdoor-belgium';
update festivals set image_url = 'https://www.glitchfestival.com/wp-content/uploads/2025/08/thumbnail16-9-1.jpg' where slug = 'glitch-festival';
update festivals set image_url = 'https://gottwood.co.uk//staging/wp-content/uploads/2022/08/538ead83-baed-4960-8bb3-1f02598464ba.jpeg' where slug = 'gottwood-festival';
update festivals set image_url = 'https://cdn.prod.website-files.com/64d366b33ca7f23f2df3eefc/6979f7e34fb7b6f13a6a5f03_2026-Horst-Festival-web-Header%20Large.jpeg' where slug = 'horst-music-festival';
update festivals set image_url = 'https://www.houghtonfestival.co.uk/wp-content/uploads/2025/09/fb-share-2026.png' where slug = 'houghton-festival';
update festivals set image_url = 'https://intothegrave.nl/wp-content/uploads/2025/11/ITG24_DAY3_PUBLIEK_08-scaled-e1762171941705.jpg' where slug = 'into-the-grave';
update festivals set image_url = 'https://wqwkvllpzjwgqkhsgqfq.supabase.co/storage/v1/object/public/media/pages/meta-images/1765779232976_0jc57ozeft1o.webp' where slug = 'junction-2-festival';
update festivals set image_url = 'https://nibirii.com/wp-content/uploads/2026/01/NF25_SocialShareImage.webp' where slug = 'nibirii-festival';
update festivals set image_url = 'http://static1.squarespace.com/static/5cdacfd7d2fa40000195a355/t/69d7baf49954197a6af03a07/1775745780183/final-wave-16x9.jpg?format=1500w' where slug = 'karrusel';
update festivals set image_url = 'https://antipopmusicfestival.com/wp-content/uploads/2025/10/DUBLAB_NEOSTAGE_NEOPOP_2025_MIGUEL.DE_.SOUSAA_002-1-scaled.jpg' where slug = 'neopop';
update festivals set image_url = 'https://terminalvcroatia.com/wp-content/uploads/2025/08/TV-Croatia-Thurs-Anthony-Mooney-D3-34-1200x1000.jpg' where slug = 'terminal-v-croatia';
update festivals set image_url = 'https://vagosmetalfest.com/wp-content/uploads/2026/06/VMF26-SiteWEB-2048x1152.jpg' where slug = 'vagos-metal-fest';
update festivals set image_url = 'https://www.webarcelona.net/sites/default/files/events/soundit_festival_barcelona.webp' where slug = 'soundit-festival';
update festivals set image_url = 'https://sunandthunderfest.com/wp-content/uploads/SAT_1350-1.jpg' where slug = 'sun-and-thunder-festival';
update festivals set image_url = 'https://static.wixstatic.com/media/629d4e_0f12cde98e514ae19f8f5bb5e053992a%7Emv2.jpg/v1/fit/w_2500,h_1330,al_c/629d4e_0f12cde98e514ae19f8f5bb5e053992a%7Emv2.jpg' where slug = 'sylak-open-air';
