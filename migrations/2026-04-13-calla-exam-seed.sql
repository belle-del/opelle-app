-- ============================================================
-- Calla Exam Content Seed: NIC Cosmetology Exam Material
-- 50 questions (10 per domain) + 25 flashcards (5 per domain)
-- State: NM (New Mexico)
-- ============================================================

-- ============================================================
-- DOMAIN 1: Scientific Concepts (10 questions + 5 flashcards)
-- ============================================================

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES

('Scientific Concepts', 'Chemistry', 'pH', 'question',
 'What is the pH range of hair and skin?',
 '["A. 2.5 to 3.5", "B. 4.5 to 5.5", "C. 6.5 to 7.5", "D. 8.5 to 9.5"]',
 'B', 'Hair and skin have a natural pH of 4.5 to 5.5, which is slightly acidic. This is often referred to as the acid mantle and helps protect against bacterial growth.',
 2, 'NM'),

('Scientific Concepts', 'Chemistry', 'Chemical Bonds', 'question',
 'Which type of bond in the hair cortex is broken by water or heat and reforms when dried or cooled?',
 '["A. Disulfide bond", "B. Peptide bond", "C. Hydrogen bond", "D. Salt bond"]',
 'C', 'Hydrogen bonds are physical side bonds that are easily broken by water or heat. They are responsible for temporary changes in hair shape, such as wet sets and blowouts.',
 2, 'NM'),

('Scientific Concepts', 'Chemistry', 'Chemical Bonds', 'question',
 'Disulfide bonds are broken during which chemical service?',
 '["A. Shampoo and conditioning", "B. Permanent waving and chemical relaxing", "C. Semi-permanent hair color", "D. Deep conditioning treatment"]',
 'B', 'Disulfide bonds are strong chemical side bonds broken only by chemicals such as permanent wave solution (thio) or chemical relaxers containing sodium hydroxide or other reducing agents.',
 3, 'NM'),

('Scientific Concepts', 'Bacteriology', 'Infection Control', 'question',
 'Which type of bacteria are round-shaped and can cause strep throat or staph infections?',
 '["A. Bacilli", "B. Spirilla", "C. Cocci", "D. Flagella"]',
 'C', 'Cocci are round-shaped bacteria. Staphylococci grow in clusters and cause skin infections such as boils; streptococci grow in chains and can cause strep throat.',
 2, 'NM'),

('Scientific Concepts', 'Bacteriology', 'Pathogens', 'question',
 'What is the term for bacteria that are harmful and can cause disease?',
 '["A. Nonpathogenic", "B. Pathogenic", "C. Saprophytic", "D. Symbiotic"]',
 'B', 'Pathogenic bacteria are harmful microorganisms that can cause disease or infection. Nonpathogenic bacteria are harmless and may even be beneficial.',
 1, 'NM'),

('Scientific Concepts', 'Bacteriology', 'Infection Control', 'question',
 'Bloodborne pathogens such as hepatitis B and HIV can be transmitted through which route in a salon setting?',
 '["A. Airborne droplets only", "B. Contact with contaminated blood or body fluids", "C. Sharing combs and brushes", "D. Touching intact skin"]',
 'B', 'Bloodborne pathogens are transmitted through contact with infected blood or body fluids. In a salon, this can occur through cuts from razors, shears, or other sharp implements.',
 2, 'NM'),

('Scientific Concepts', 'Anatomy', 'Skin Structure', 'question',
 'Which layer of the skin contains blood vessels, nerve endings, sebaceous glands, and hair follicles?',
 '["A. Epidermis", "B. Dermis", "C. Subcutaneous tissue", "D. Stratum corneum"]',
 'B', 'The dermis (also called the derma or true skin) is the second layer of skin and contains blood vessels, lymph vessels, nerves, sweat glands, oil glands, and hair follicles.',
 2, 'NM'),

('Scientific Concepts', 'Anatomy', 'Skin Structure', 'question',
 'The outermost layer of the epidermis composed of dead keratinized cells is the:',
 '["A. Stratum granulosum", "B. Stratum lucidum", "C. Stratum corneum", "D. Stratum germinativum"]',
 'C', 'The stratum corneum is the outermost layer of the epidermis. It is made up of flat, dead, keratinized cells that are continuously shed and replaced.',
 2, 'NM'),

('Scientific Concepts', 'Anatomy', 'Hair Growth Cycle', 'question',
 'During which phase of the hair growth cycle is the hair actively growing?',
 '["A. Catagen", "B. Telogen", "C. Anagen", "D. Exogen"]',
 'C', 'The anagen phase is the active growth phase of hair. Hair grows approximately half an inch per month, and the anagen phase can last 2 to 6 years for scalp hair.',
 1, 'NM'),

('Scientific Concepts', 'Chemistry', 'pH', 'question',
 'A solution with a pH of 3.0 compared to a solution with a pH of 5.0 is how many times more acidic?',
 '["A. 2 times", "B. 10 times", "C. 100 times", "D. 1,000 times"]',
 'C', 'The pH scale is logarithmic; each whole number change represents a tenfold change in acidity or alkalinity. A pH of 3 is 10 x 10 = 100 times more acidic than a pH of 5.',
 3, 'NM');

-- Scientific Concepts Flashcards

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES

('Scientific Concepts', 'Chemistry', 'pH', 'flashcard',
 'What does pH measure?',
 'pH measures the acidity or alkalinity of a solution on a scale of 0 to 14. A pH of 7 is neutral, below 7 is acidic, and above 7 is alkaline.',
 1, 'NM'),

('Scientific Concepts', 'Chemistry', 'Chemical Bonds', 'flashcard',
 'Name the three types of side bonds found in the hair cortex.',
 'Hydrogen bonds (broken by water/heat), salt bonds (broken by pH changes), and disulfide bonds (broken only by chemicals). Hydrogen and salt bonds are physical bonds; disulfide bonds are chemical bonds.',
 2, 'NM'),

('Scientific Concepts', 'Bacteriology', 'Pathogens', 'flashcard',
 'What are the three basic shapes of bacteria?',
 'Cocci (round), bacilli (rod-shaped), and spirilla (spiral or corkscrew-shaped).',
 1, 'NM'),

('Scientific Concepts', 'Anatomy', 'Hair Growth Cycle', 'flashcard',
 'What are the three phases of the hair growth cycle?',
 'Anagen (active growth, 2-6 years), catagen (transition/regression, 1-2 weeks), and telogen (resting/shedding, 3-5 months). About 90% of scalp hair is in anagen at any time.',
 2, 'NM'),

('Scientific Concepts', 'Anatomy', 'Skin Structure', 'flashcard',
 'What are the five layers of the epidermis from deepest to outermost?',
 'Stratum germinativum (basal), stratum spinosum, stratum granulosum, stratum lucidum (only on palms and soles), and stratum corneum (outermost, dead keratinized cells).',
 3, 'NM');


-- ============================================================
-- DOMAIN 2: Hair Design (10 questions + 5 flashcards)
-- ============================================================

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES

('Hair Design', 'Cutting', 'Techniques', 'question',
 'Cutting hair at a 90-degree elevation from the head form creates which type of haircut?',
 '["A. One-length (0-degree)", "B. Graduated (45-degree)", "C. Uniform layered", "D. Long layered (180-degree)"]',
 'C', 'A 90-degree elevation creates uniform layers where all hair lengths are equal when held at 90 degrees from the head. This produces even volume and movement throughout the cut.',
 2, 'NM'),

('Hair Design', 'Cutting', 'Tools', 'question',
 'What is the purpose of thinning shears in haircutting?',
 '["A. To create blunt cutting lines", "B. To remove bulk and blend weight lines", "C. To cut bangs precisely", "D. To razor cut fine hair"]',
 'B', 'Thinning shears (also called texturizing shears) have teeth on one or both blades and are used to remove bulk, blend weight lines, and create texture without shortening the overall length.',
 2, 'NM'),

('Hair Design', 'Cutting', 'Angles', 'question',
 'A graduated haircut is typically cut at what degree of elevation?',
 '["A. 0 degrees", "B. 45 degrees", "C. 90 degrees", "D. 180 degrees"]',
 'B', 'Graduated haircuts are cut at approximately 45 degrees of elevation, creating a stacked effect where shorter layers build up on top of longer layers, resulting in a wedge-like shape.',
 2, 'NM'),

('Hair Design', 'Styling', 'Blowdry', 'question',
 'When blowdrying hair for maximum volume, the stylist should direct the airflow:',
 '["A. Down the hair shaft to smooth the cuticle", "B. Against the direction of growth at the roots", "C. Parallel to the hair at mid-shaft only", "D. In circular motions around the entire head"]',
 'B', 'Directing airflow against the direction of growth (lifting at the roots) creates maximum volume and lift. Using a round brush further enhances this technique.',
 2, 'NM'),

('Hair Design', 'Styling', 'Updos', 'question',
 'Which tool is used to secure a French twist hairstyle in place?',
 '["A. Butterfly clips", "B. Bobby pins and hairpins", "C. Elastic bands only", "D. Sectioning clips"]',
 'B', 'Bobby pins and hairpins are the primary tools for securing a French twist. Bobby pins grip the hair in place, while hairpins (U-shaped) hold the rolled section securely.',
 1, 'NM'),

('Hair Design', 'Coloring', 'Color Theory', 'question',
 'Which color on the color wheel neutralizes (cancels out) unwanted orange tones in hair?',
 '["A. Red", "B. Yellow", "C. Blue", "D. Green"]',
 'C', 'Blue is the complementary (opposite) color of orange on the color wheel. Blue-based toners and demi-permanent colors are used to neutralize unwanted orange or brassy tones.',
 2, 'NM'),

('Hair Design', 'Coloring', 'Application', 'question',
 'When applying virgin permanent hair color to lighten, where should color be applied first?',
 '["A. At the scalp area first", "B. On the mid-shaft and ends first, then the scalp area last", "C. On the ends only", "D. Evenly from roots to ends simultaneously"]',
 'B', 'Body heat from the scalp accelerates processing. Mid-shaft and ends are applied first and allowed to process before the scalp area, ensuring even color development from roots to ends.',
 3, 'NM'),

('Hair Design', 'Coloring', 'Formulation', 'question',
 'What is the function of the developer (hydrogen peroxide) in permanent hair color?',
 '["A. Deposits color only", "B. Conditions the hair shaft", "C. Lifts natural pigment and activates color molecules", "D. Closes the cuticle after processing"]',
 'C', 'Developer (hydrogen peroxide) serves two functions: it lifts (lightens) the natural melanin pigment in the cortex and activates the oxidation dye molecules so they can deposit color.',
 2, 'NM'),

('Hair Design', 'Chemical Texture', 'Perms', 'question',
 'The main active ingredient in alkaline (cold) permanent wave solution is:',
 '["A. Sodium hydroxide", "B. Ammonium thioglycolate", "C. Glyceryl monothioglycolate", "D. Calcium hydroxide"]',
 'B', 'Ammonium thioglycolate (ATG) is the active ingredient in alkaline/cold waves. It breaks disulfide bonds in the cortex, allowing the hair to conform to the shape of the perm rod.',
 2, 'NM'),

('Hair Design', 'Chemical Texture', 'Relaxers', 'question',
 'Which type of chemical relaxer requires a base cream to be applied to the scalp before application?',
 '["A. No-lye relaxer", "B. Ammonium thioglycolate relaxer", "C. Sodium hydroxide (lye) relaxer", "D. Keratin treatment"]',
 'C', 'Sodium hydroxide (lye) relaxers have a very high pH (12-14) and can cause chemical burns. A protective base cream must be applied to the scalp and around the hairline before application.',
 3, 'NM');

-- Hair Design Flashcards

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES

('Hair Design', 'Cutting', 'Angles', 'flashcard',
 'What are the four basic haircut elevations and their results?',
 '0 degrees = one-length/solid form, 45 degrees = graduated/stacked form, 90 degrees = uniform layers (equal lengths), 180 degrees = long layers (longer interior, shorter exterior).',
 2, 'NM'),

('Hair Design', 'Coloring', 'Color Theory', 'flashcard',
 'What are the three primary colors and three secondary colors in hair color theory?',
 'Primary: red, yellow, blue (cannot be mixed from other colors). Secondary: orange (red + yellow), green (yellow + blue), violet (red + blue). Complementary colors sit opposite on the color wheel and neutralize each other.',
 2, 'NM'),

('Hair Design', 'Coloring', 'Formulation', 'flashcard',
 'What are the four levels of hydrogen peroxide developer and their uses?',
 '10-volume (3%): deposit only, minimal lift. 20-volume (6%): standard lift of 1-2 levels, most common. 30-volume (9%): 2-3 levels of lift. 40-volume (12%): 3-4 levels of lift, high-lift blonding.',
 3, 'NM'),

('Hair Design', 'Chemical Texture', 'Perms', 'flashcard',
 'What is the difference between an endothermic and exothermic perm?',
 'Endothermic perms require an external heat source (hooded dryer) to process. Exothermic perms generate their own heat through a chemical reaction when an activator is mixed with the waving lotion.',
 3, 'NM'),

('Hair Design', 'Styling', 'Curling', 'flashcard',
 'What determines the size of a curl when using a curling iron?',
 'The barrel diameter determines curl size: smaller barrels create tighter curls, larger barrels create looser waves. The amount of hair in each section and wrapping technique also affect the result.',
 1, 'NM');


-- ============================================================
-- DOMAIN 3: Skin Care (10 questions + 5 flashcards)
-- ============================================================

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES

('Skin Care', 'Facials', 'Skin Analysis', 'question',
 'A client with large pores, a shiny T-zone, and frequent breakouts most likely has which skin type?',
 '["A. Dry (alipidic)", "B. Normal", "C. Oily", "D. Sensitive"]',
 'C', 'Oily skin is characterized by overactive sebaceous glands, enlarged pores, a shiny or greasy appearance (especially in the T-zone), and a tendency toward acne and breakouts.',
 1, 'NM'),

('Skin Care', 'Facials', 'Skin Analysis', 'question',
 'What tool uses a magnifying lamp with a cool fluorescent light to analyze skin conditions during a facial?',
 '["A. Galvanic machine", "B. High-frequency machine", "C. Woods lamp", "D. Steamer"]',
 'C', 'A Woods lamp (filtered black light) is used during skin analysis to reveal conditions not visible to the naked eye, such as sun damage, dehydration, pigmentation disorders, and fungal infections.',
 2, 'NM'),

('Skin Care', 'Facials', 'Treatments', 'question',
 'During a facial, what is the purpose of desincrustation using galvanic current?',
 '["A. To tone and firm the skin", "B. To soften and emulsify sebum and debris in follicles", "C. To increase product absorption post-treatment", "D. To kill surface bacteria"]',
 'B', 'Desincrustation uses the negative pole of galvanic current along with an alkaline solution to soften sebum plugs and emulsify oil and debris in the follicles, making extractions easier.',
 3, 'NM'),

('Skin Care', 'Facials', 'Treatments', 'question',
 'Which type of facial mask is best suited for oily and acne-prone skin?',
 '["A. Paraffin wax mask", "B. Cream mask", "C. Clay-based mask", "D. Collagen sheet mask"]',
 'C', 'Clay-based masks (such as kaolin or bentonite) absorb excess oil, draw out impurities, and tighten pores. They are ideal for oily, congested, and acne-prone skin types.',
 2, 'NM'),

('Skin Care', 'Facials', 'Treatments', 'question',
 'High-frequency current applied directly to the skin with a glass electrode is used to:',
 '["A. Relax facial muscles", "B. Stimulate circulation and kill bacteria", "C. Penetrate water-soluble products", "D. Remove dead skin cells"]',
 'B', 'High-frequency (Tesla) current produces heat and a germicidal effect through ozone or ultraviolet sparking. The direct method stimulates blood flow and has antibacterial properties for acne-prone skin.',
 3, 'NM'),

('Skin Care', 'Hair Removal', 'Waxing', 'question',
 'When performing a waxing service, the wax should be applied in which direction?',
 '["A. Against the direction of hair growth", "B. In the direction of hair growth", "C. In a circular motion", "D. Direction does not matter"]',
 'B', 'Wax is applied in the direction of hair growth and removed against the direction of hair growth. This ensures the wax adheres to and coats the hair properly for effective removal.',
 1, 'NM'),

('Skin Care', 'Hair Removal', 'Waxing', 'question',
 'A contraindication for waxing services includes a client who:',
 '["A. Has normal, healthy skin", "B. Is using topical retinoids such as tretinoin", "C. Had a facial one week ago", "D. Has thick, coarse body hair"]',
 'B', 'Topical retinoids (Retin-A, tretinoin, Accutane) thin the skin and make it more fragile. Waxing a client using these products can cause the skin to lift, tear, or become severely irritated.',
 2, 'NM'),

('Skin Care', 'Makeup Application', 'Color Theory', 'question',
 'To neutralize dark circles with a blue or purple undertone, a makeup artist should use:',
 '["A. Green concealer", "B. Yellow or peach concealer", "C. Lavender primer", "D. White highlighter"]',
 'B', 'Yellow and peach/orange tones are opposite blue and purple on the color wheel. A yellow or peach-toned concealer neutralizes blue-purple dark circles before foundation application.',
 2, 'NM'),

('Skin Care', 'Makeup Application', 'Application Techniques', 'question',
 'What is the correct order for a complete makeup application?',
 '["A. Foundation, concealer, primer, powder, eyes, lips", "B. Primer, foundation, concealer, powder, eyes, blush, lips", "C. Concealer, primer, foundation, eyes, blush, lips", "D. Powder, primer, foundation, concealer, eyes, lips"]',
 'B', 'The correct sequence is: primer (prepares skin), foundation (evens skin tone), concealer (spot-corrects), powder (sets), eye makeup, blush/bronzer, and lips last.',
 2, 'NM'),

('Skin Care', 'Facials', 'Skin Analysis', 'question',
 'Combination skin is typically characterized by:',
 '["A. Dryness all over the face", "B. An oily T-zone with dry or normal cheeks", "C. Sensitivity to all products", "D. Even moisture levels throughout"]',
 'B', 'Combination skin features an oily T-zone (forehead, nose, chin) with normal to dry cheeks. It requires using different products or techniques for different zones of the face.',
 1, 'NM');

-- Skin Care Flashcards

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES

('Skin Care', 'Facials', 'Skin Analysis', 'flashcard',
 'What are the four main skin types recognized in esthetics?',
 'Normal (balanced), oily (overactive sebaceous glands, enlarged pores), dry/alipidic (underactive oil production, tight feeling), and combination (oily T-zone, dry or normal cheeks).',
 1, 'NM'),

('Skin Care', 'Facials', 'Treatments', 'flashcard',
 'What is the difference between the anode and cathode in galvanic current treatments?',
 'Anode (positive pole): tightens skin, decreases blood flow, calms nerves. Cathode (negative pole): softens tissues, stimulates blood flow, increases alkalinity (used in desincrustation). Product is pushed from the same-polarity pole.',
 3, 'NM'),

('Skin Care', 'Hair Removal', 'Waxing', 'flashcard',
 'What is the difference between hard wax and soft wax?',
 'Soft (strip) wax is applied thinly and removed with a fabric or paper strip. Hard wax is applied thickly, hardens as it cools, and is removed without a strip. Hard wax is gentler and preferred for sensitive areas (face, bikini).',
 2, 'NM'),

('Skin Care', 'Makeup Application', 'Application Techniques', 'flashcard',
 'What is the purpose of a primer in makeup application?',
 'Primer creates a smooth base that helps foundation adhere better, last longer, and apply more evenly. It can also minimize the appearance of pores, fine lines, and uneven texture.',
 1, 'NM'),

('Skin Care', 'Facials', 'Treatments', 'flashcard',
 'Name three common types of chemical exfoliants used in professional facials.',
 'AHAs (alpha hydroxy acids, e.g., glycolic acid, lactic acid) for dry/sun-damaged skin; BHAs (beta hydroxy acids, e.g., salicylic acid) for oily/acne-prone skin; enzyme peels (papain, bromelain) for sensitive skin.',
 3, 'NM');


-- ============================================================
-- DOMAIN 4: Nail Care (10 questions + 5 flashcards)
-- ============================================================

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES

('Nail Care', 'Manicure', 'Techniques', 'question',
 'What is the correct order of steps in a basic manicure?',
 '["A. Polish, file, soak, cuticle care, massage", "B. File, soak, cuticle care, massage, polish", "C. Soak, file, cuticle care, polish, massage", "D. Cuticle care, soak, file, massage, polish"]',
 'B', 'A basic manicure follows the sequence: remove old polish, shape/file nails, soak fingers, push back and clean cuticles, massage hand and arm, then apply base coat, color, and top coat.',
 2, 'NM'),

('Nail Care', 'Manicure', 'Techniques', 'question',
 'When filing natural nails, the nail technician should file:',
 '["A. In a back-and-forth sawing motion", "B. From the outer edge toward the center in one direction", "C. From the center outward in both directions", "D. Only the free edge, never the sides"]',
 'B', 'Filing should be done from the outer edge toward the center in one direction to prevent splitting and weakening the nail plate. Back-and-forth sawing can cause nail damage and peeling.',
 2, 'NM'),

('Nail Care', 'Nail Disorders', 'Identification', 'question',
 'Onychomycosis is a condition caused by:',
 '["A. Bacteria under the nail", "B. Fungal infection of the nail", "C. Allergic reaction to nail products", "D. Physical trauma to the nail bed"]',
 'B', 'Onychomycosis is a fungal infection of the nail that causes thickening, discoloration (yellow, white, or brown), and brittleness. Nail technicians must not service affected nails and should refer the client to a physician.',
 2, 'NM'),

('Nail Care', 'Nail Disorders', 'Identification', 'question',
 'A greenish discoloration on or under the nail plate is most commonly caused by:',
 '["A. A bruise from trauma", "B. Pseudomonas aeruginosa bacterial infection", "C. Iron deficiency", "D. Overexposure to UV light"]',
 'B', 'Green discoloration (sometimes called "greenies") is caused by the bacterium Pseudomonas aeruginosa, which thrives in moisture trapped between the nail plate and an enhancement or the nail bed.',
 3, 'NM'),

('Nail Care', 'Pedicure', 'Techniques', 'question',
 'During a pedicure, the foot soak serves the primary purpose of:',
 '["A. Disinfecting the feet", "B. Softening the skin and cuticles", "C. Removing nail polish", "D. Stimulating nail growth"]',
 'B', 'The warm water foot soak softens the skin, cuticles, and calluses, making them easier to work with during the pedicure. An antibacterial soap is added for cleansing, but the soak itself is not a disinfection step.',
 1, 'NM'),

('Nail Care', 'Pedicure', 'Techniques', 'question',
 'Which tool is used to smooth rough skin and reduce calluses on the feet during a pedicure?',
 '["A. Cuticle nipper", "B. Nail buffer", "C. Foot file or paddle", "D. Orangewood stick"]',
 'C', 'A foot file (also called a paddle or foot rasp) is used to smooth calluses and rough skin on the heels and balls of the feet. It is used on damp skin after soaking.',
 1, 'NM'),

('Nail Care', 'Nail Enhancements', 'Acrylic', 'question',
 'Acrylic nail enhancements are created by combining:',
 '["A. UV gel and a curing lamp", "B. Liquid monomer and powder polymer", "C. Nail glue and silk wraps", "D. Resin and fiberglass"]',
 'B', 'Acrylic nails are created by mixing liquid monomer (ethyl methacrylate) with powder polymer (polymethyl methacrylate). The mixture undergoes polymerization and hardens without the need for a UV light.',
 2, 'NM'),

('Nail Care', 'Nail Enhancements', 'Gel', 'question',
 'What cures UV gel nail enhancements and causes them to harden?',
 '["A. Air exposure", "B. Chemical catalyst mixed in", "C. Exposure to UV or LED light", "D. Evaporation of solvents"]',
 'C', 'UV gel nails contain photoinitiators that react with UV or LED light, triggering polymerization and curing the gel into a hard, glossy finish. Without the light, the gel remains soft.',
 2, 'NM'),

('Nail Care', 'Manicure', 'Techniques', 'question',
 'What is the purpose of a base coat in a manicure?',
 '["A. To add shine to the finished nails", "B. To prevent staining and help polish adhere to the nail plate", "C. To speed up drying time", "D. To strengthen weak or brittle nails"]',
 'B', 'Base coat creates a bond between the natural nail and the polish, helping it adhere and last longer. It also prevents dark-colored polishes from staining the natural nail plate.',
 1, 'NM'),

('Nail Care', 'Nail Disorders', 'Identification', 'question',
 'Beau lines on the nail plate are horizontal ridges or grooves that indicate:',
 '["A. Overuse of nail enhancements", "B. A period of illness, injury, or severe stress that temporarily slowed nail growth", "C. A fungal infection beginning", "D. Normal aging of the nail"]',
 'B', 'Beau lines are horizontal depressions across the nail plate caused by a temporary disruption in nail growth due to illness, severe stress, chemotherapy, or injury to the nail matrix.',
 3, 'NM');

-- Nail Care Flashcards

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES

('Nail Care', 'Manicure', 'Techniques', 'flashcard',
 'What are the five basic nail shapes?',
 'Square (straight across, sharp corners), round (follows natural curve), oval (tapered, egg-shaped tip), squoval (square with rounded edges, most popular), and pointed/stiletto (dramatic tapered point).',
 1, 'NM'),

('Nail Care', 'Nail Disorders', 'Identification', 'flashcard',
 'What nail conditions should a nail technician refuse to service and refer to a physician?',
 'Any signs of infection (bacterial, fungal), onychomycosis (fungal nails), onycholysis (nail lifting with discoloration), severe inflammation, paronychia (infected skin around the nail), and any open wounds or lesions near the nail.',
 2, 'NM'),

('Nail Care', 'Nail Enhancements', 'Acrylic', 'flashcard',
 'What is the monomer-to-polymer ratio (bead consistency) for acrylic nails?',
 'The ideal bead has a medium-wet consistency (1.5:1 liquid to powder ratio). Too wet = slow curing, weak, yellow. Too dry = lumpy, poor adhesion, difficult to shape. A properly mixed bead should hold its shape and have a smooth, glossy surface.',
 3, 'NM'),

('Nail Care', 'Pedicure', 'Techniques', 'flashcard',
 'Why must pedicure basins be disinfected between every client?',
 'Pedicure basins can harbor bacteria, fungi, and other pathogens. After each client, all debris must be removed, the basin must be cleaned with soap and water, then disinfected with an EPA-registered hospital-grade disinfectant for the required contact time.',
 2, 'NM'),

('Nail Care', 'Nail Enhancements', 'Gel', 'flashcard',
 'What are the three types of gel used in a gel nail enhancement system?',
 'Base gel (bonding gel that adheres to the natural nail), building gel (provides structure and strength, used to sculpt the extension), and top/sealing gel (provides a glossy, protective finish). Some systems use a one-step gel combining all functions.',
 2, 'NM');


-- ============================================================
-- DOMAIN 5: Professional Practices (10 questions + 5 flashcards)
-- ============================================================

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES

('Professional Practices', 'Sanitation and Disinfection', 'Procedures', 'question',
 'What is the correct order for processing reusable tools after use on a client?',
 '["A. Disinfect, rinse, clean, store", "B. Clean, rinse, disinfect for required contact time, rinse, store", "C. Rinse, store, disinfect when ready to use", "D. Sterilize, rinse, store"]',
 'B', 'The correct decontamination process is: clean (remove debris with soap and water), rinse, fully immerse in EPA-registered disinfectant for the manufacturer-specified contact time, rinse, and store in a clean covered container.',
 2, 'NM'),

('Professional Practices', 'Sanitation and Disinfection', 'Procedures', 'question',
 'Which level of decontamination is the highest used in salons?',
 '["A. Sanitation", "B. Disinfection", "C. Sterilization", "D. Antisepsis"]',
 'B', 'Disinfection is the highest level of decontamination used in salons and schools. Sterilization (destroying all microbial life) is only required in medical settings. Salons use EPA-registered hospital-grade disinfectants.',
 2, 'NM'),

('Professional Practices', 'Sanitation and Disinfection', 'Products', 'question',
 'Quaternary ammonium compounds (quats) are used in salons as:',
 '["A. Sterilants for metal implements", "B. Disinfectants for non-porous tools and surfaces", "C. Antiseptics for open wounds", "D. Sanitizers for the stylist hands only"]',
 'B', 'Quats are EPA-registered disinfectants effective against bacteria, some viruses, and fungi on non-porous surfaces. They are commonly used in salon implement disinfection. They are not sterilants and should not be used on skin wounds.',
 2, 'NM'),

('Professional Practices', 'Sanitation and Disinfection', 'Procedures', 'question',
 'If a client is accidentally cut during a service, the first step is to:',
 '["A. Apply disinfectant directly to the wound", "B. Stop the service and apply a styptic or antiseptic while wearing gloves", "C. Continue the service and address the cut afterward", "D. Immediately sterilize all tools used"]',
 'B', 'Stop the service, put on gloves, clean the wound, and apply an antiseptic or styptic agent. Contaminated tools must be cleaned and disinfected before reuse. Document the incident per salon protocol.',
 3, 'NM'),

('Professional Practices', 'Business Skills', 'Client Management', 'question',
 'Maintaining accurate client service records is important primarily because:',
 '["A. It is required for tax purposes only", "B. It helps ensure consistent results, track chemical history, and identify allergies", "C. It determines how much to charge each client", "D. It is only needed for new clients"]',
 'B', 'Client records document chemical services performed, formulas used, allergies, and skin sensitivities. This ensures consistent results, prevents adverse reactions, and provides legal protection.',
 2, 'NM'),

('Professional Practices', 'Business Skills', 'Salon Management', 'question',
 'Which type of business ownership has the simplest structure and gives one person complete control?',
 '["A. Partnership", "B. Corporation", "C. Sole proprietorship", "D. Limited liability company"]',
 'C', 'A sole proprietorship is the simplest business structure. One person owns and operates the business, makes all decisions, and assumes all liability. It requires minimal paperwork to establish.',
 1, 'NM'),

('Professional Practices', 'NM State Law', 'Licensing', 'question',
 'In New Mexico, how many training hours are required to obtain a cosmetology license?',
 '["A. 1,000 hours", "B. 1,200 hours", "C. 1,600 hours", "D. 2,100 hours"]',
 'C', 'New Mexico requires 1,600 hours of training from an approved cosmetology school to be eligible for the state cosmetology license examination, as mandated by the New Mexico Board of Barbers and Cosmetologists.',
 2, 'NM'),

('Professional Practices', 'NM State Law', 'Licensing', 'question',
 'The New Mexico Board of Barbers and Cosmetologists requires cosmetology licenses to be renewed every:',
 '["A. 1 year", "B. 2 years", "C. 3 years", "D. 5 years"]',
 'C', 'In New Mexico, cosmetology licenses must be renewed every three years. Licensees must meet any continuing education requirements and pay the renewal fee before the expiration date to avoid practicing on an expired license.',
 2, 'NM'),

('Professional Practices', 'NM State Law', 'Regulatory', 'question',
 'Under New Mexico regulations, a salon must display which of the following in a visible location?',
 '["A. The owner personal tax records", "B. All current practitioner licenses and the salon establishment license", "C. Only the salon establishment license", "D. A list of prices for all services"]',
 'B', 'New Mexico law requires that the salon establishment license and all individual practitioner licenses be posted in a conspicuous place visible to the public within the salon at all times.',
 2, 'NM'),

('Professional Practices', 'NM State Law', 'Regulatory', 'question',
 'In New Mexico, practicing cosmetology without a valid license can result in:',
 '["A. A verbal warning only for first offenders", "B. Civil penalties, fines, and possible criminal misdemeanor charges", "C. Automatic license suspension for 6 months", "D. No consequences if the practitioner has passed the exam"]',
 'B', 'Practicing cosmetology without a valid New Mexico license is a violation of state law. The Board can impose civil penalties and fines, and the violation may constitute a misdemeanor offense under New Mexico statutes.',
 3, 'NM');

-- Professional Practices Flashcards

INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES

('Professional Practices', 'Sanitation and Disinfection', 'Procedures', 'flashcard',
 'What is the difference between sanitation, disinfection, and sterilization?',
 'Sanitation: lowest level, reduces germs to safe levels (handwashing, sweeping). Disinfection: mid-level, destroys most pathogens on non-porous surfaces (EPA-registered chemicals). Sterilization: highest level, destroys all microbial life (autoclaves, used only in medical settings).',
 2, 'NM'),

('Professional Practices', 'Sanitation and Disinfection', 'Products', 'flashcard',
 'What does EPA-registered mean for a salon disinfectant?',
 'EPA-registered means the product has been tested and approved by the U.S. Environmental Protection Agency to be effective against specific pathogens listed on its label. Salons must use hospital-grade, EPA-registered disinfectants and follow label instructions for dilution and contact time.',
 2, 'NM'),

('Professional Practices', 'NM State Law', 'Licensing', 'flashcard',
 'What are the requirements to obtain a cosmetology license in New Mexico?',
 'Must be at least 16 years old (or have parental consent), complete 1,600 hours of training at an NM-approved school, pass the NIC written and practical examinations, and submit an application with fees to the NM Board of Barbers and Cosmetologists.',
 2, 'NM'),

('Professional Practices', 'NM State Law', 'Regulatory', 'flashcard',
 'What powers does the New Mexico Board of Barbers and Cosmetologists have?',
 'The Board can issue, renew, suspend, and revoke licenses; inspect salon establishments for compliance; investigate complaints; impose fines and civil penalties; establish sanitation standards; and approve cosmetology schools operating in New Mexico.',
 3, 'NM'),

('Professional Practices', 'Business Skills', 'Client Management', 'flashcard',
 'What information should be documented on a client consultation/intake card?',
 'Name, contact information, medical history (allergies, medications, skin conditions), chemical service history, hair/skin/nail analysis notes, products used, formulas, processing times, results, and any adverse reactions.',
 2, 'NM');
