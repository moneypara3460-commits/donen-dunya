// # duvar   ^ diken   G hedef   S başlangıç (yerçekimi aşağı, sağa koşar)
export const LEVELS=[
 {name:"İlk Adım",par:2,hint:"Duvara gelince SAĞA dokun: dünya döner, duvar zemin olur.",rows:[
  "###########","#         #","#         #","#         #","#         #","#         #",
  "#         #","#         #","#     #   #","#S    #  G#","###########"]},
 {name:"Dikenli Yol",par:2,hint:"Dikenlerden önce dokun ve üstlerinden uç.",rows:[
  "###########","#         #","#         #","#         #","#         #","#         #",
  "#         #","#         #","#         #","#S  ^^^  G#","###########"]},
 {name:"Pencere",par:2,hint:"Sol ve sağ dokunuşlar dünyayı ters yöne döndürür.",rows:[
  "###########","#         #","#         #","#   ###   #","#   # #   #","#   # #   #",
  "#         #","#         #","#         #","#S   ^   G#","###########"]},
 {name:"Merdiven",par:3,hint:"Basamakları dönerek çık.",rows:[
  "###########","#         #","#        G#","#       ###","#     ##^^#","#   ##    #",
  "# ##^^^   #","#   ^^^   #","#S        #","###########"]},
 {name:"Çukur",par:4,hint:"Duvarı aşıp dikenlerin üstünden geç.",rows:[
  "###########","#         #","#         #","#         #","#    #    #","#    #    #",
  "#    #    #","#    #    #","#S   #^^ G#","###########"]},
 {name:"Yörünge",par:4,hint:"Hedef havada, platformun üstünde.",rows:[
  "###########","#         #","#  ^   ^  #","#         #","#    G    #","#  #####  #",
  "#         #","#         #","#S   ^    #","###########"]},
 {name:"Sarmal",par:3,hint:"Köşelerde zamanlamayı iyi tut.",rows:[
  "###########","#         #","# ####### #","# #     # #","# #  ^  # #","# # #G  # #",
  "# #       #","# ######  #","#S        #","###########"]},
 {name:"Zikzak",par:6,hint:"Son bölüm! Sakin kal, ritmi yakala.",rows:[
  "###########","#    ^    #","#         #","#  ##  ## #","#         #","# ##  ##  #",
  "#         #","#  ##  ##G#","#S  ^  ^  #","###########"]}
];
