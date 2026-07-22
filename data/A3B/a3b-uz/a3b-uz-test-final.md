# Creating the structured Markdown file for download
markdown_content = """# 2025-2026学年度下学期期末检测三年级英语试题

### --- PRINTED PAGE 1 ---

**2025-2026学年度下学期期末检测三年级英语试题**  
(测试时间: 45分钟 试题: 95分 卷面: 5分)

| 题号 | 一 | 二 | 三 | 四 | 五 | 六 | 七 | 八 | 九 | 卷面 | 总分 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **得分** | | | | | | | | | | | |

#### 一、根据所给例词画线部分的发音，圈出句中含有相同发音的单词。(共10分)

1. **l**ove  
   Lions are strong.
2. **s**top  
   Do you like skating?
3. ar**t**  
   I visit my uncle on Monday.
4. **p**art  
   We have a computer class today.
5. **r**eady  
   This rice has got two short arms.

#### 二、Taotao 向大家展示了一些周末拍的照片。看图选词填空，帮 Taotao 补全照片描述。(共10分)

**Word Bank:**  
evening | feet | English | strawberries | basketball

1. [*VISUAL: A drawing showing a hand touching two feet.*]  
   Touch your __________.
2. [*VISUAL: A drawing of strawberries.*]  
   My favourite subject is __________.
3. [*VISUAL: A drawing of a child holding a basketball.*]  
   I like __________ very much.
4. [*VISUAL: A drawing of a child playing with friends.*]  
   I play __________ with my friends on Saturday.
5. [*VISUAL: A drawing representing the sky during sunset/evening.*]  
   My mother goes to work at eight in the __________.

### --- PRINTED PAGE 2 ---

#### 三、选出下列每组单词中不同类的一项。(共10分)

1. ( ) A. move | B. nose | C. head
2. ( ) A. old | B. small | C. learn
3. ( ) A. park | B. school | C. cake
4. ( ) A. art | B. subject | C. science
5. ( ) A. skate | B. brown | C. dance

#### 四、开心选一选 (共10分)

1. ( ) I like __________ weiqi with my mum.  
   A. play  
   B. plays  
   C. playing  

2. ( ) I play football __________ Saturday.  
   A. in  
   B. on  
   C. at  

3. ( ) — __________ are they?  
   — They're chameleons.  
   A. What  
   B. Where  
   C. Which  

4. ( ) It's 7 am. It's time for __________.  
   A. breakfast  
   B. lunch  
   C. dinner  

5. ( ) It's snowy outside. Let's __________.  
   A. swim  
   B. fly a kite  
   C. make a snowman  

#### 五、Sam 正在问 Lingling 一些问题。请帮助 Lingling 去回答吧。(共15分)

| Questions | Options |
| :--- | :--- |
| 1. ( ) Who's that boy? | A. Good idea. |
| 2. ( ) Let's make a snowman. | B. My hobby is writing. |
| 3. ( ) What's your hobby? | C. He's my friend, Alex. |
| 4. ( ) What do you like doing? | D. It's half past nine. |
| 5. ( ) What time is it? | E. We like playing football. |

### --- PRINTED PAGE 3 ---

#### 六、这是 Lucy 一家人的爱好，请帮她补充完整，选词填空。(共10分)

**Word Bank:**  
A. doing | B. cooking | C. reading | D. taking | E. gardening

I have a big family. They have different hobbies. My grandma likes 1. __________. She takes good care of her plants and flowers. My grandpa likes 2. __________ tai chi. He does it every day in the park. My father likes 3. __________. He's got many books. My mother likes 4. __________. She makes yummy dumplings! I like 5. __________ photos of my family!

#### 七、Nana 和 Feifei 在谈论参加俱乐部的事情。选择合适的选项，补全对话。(共10分)

**Options:**  
A. What afterschool club do you go to?  
B. Yes, I do.  
C. It's on Thursday.  
D. It starts at 4 pm.  
E. I go to the painting club.  

**Nina:** What afterschool club do you go to?  
**Feifei:** 1. __________ I like painting very much.  
**Nina:** Is it on Monday?  
**Feifei:** No. 2. __________  
**Nina:** What time?  
**Feifei:** 3. __________ It ends at five o'clock.  
**Nina:** 4. __________  
**Feifei:** I go to the science club.  
**Nina:** Do you like science very much?  
**Feifei:** 5. __________  

### --- PRINTED PAGE 4 ---

#### 八、观察 Qiqi 周一到周三的课程表，在正确的句子后打 √，错误的句子后面打 ×。(共10分)

| Monday | Tuesday | Wednesday |
| :--- | :--- | :--- |
| Chinese | maths | Chinese |
| maths | art | science |
| Chinese | Chinese | maths |
| English | PE | art |
| **Lunch time** | **lunch time** | **lunch time** |
| music | science | English |
| PE | music | maths |

1. ( ) Qiqi has two Chinese classes on Monday.
2. ( ) Qiqi has science on Monday and Tuesday.
3. ( ) Qiqi doesn't have music on Wednesday.
4. ( ) On Tuesday, Qiqi has art in the afternoon.
5. ( ) On Wednesday, Qiqi has maths in the morning and in the afternoon.

#### 九、书面表达 看图片，补全句子。(共10分)

1. [*VISUAL: A drawing of a shining sun.*]  
   It's __________.

2. [*VISUAL: A drawing of a girl swimming.*]  
   She likes __________.

3. [*VISUAL: A drawing of a clock showing 7:00.*]  
   It's seven __________.

4. [*VISUAL: A drawing of a toy robot.*]  
   I have a __________.

5. [*VISUAL: A drawing of a panda.*]  
   __________ are black and white.
"""

with open("G3-FINAL-TERM.txt", "w", encoding="utf-8") as f:
    f.write(markdown_content)