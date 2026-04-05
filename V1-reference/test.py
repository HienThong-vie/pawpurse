import tkinter as tk 
test_list = [1,2,3]
mutiply_by_two = [n for n in test_list]

print(mutiply_by_two)
#test list comprehension concepts
budgets = {
    "Food" : {"limit": 300,"period": "week","start_date": "today" },
    "GymMembership" : {"limit": 150, "period": "month","start_date": "today"},
    "Gas" : {"limit": 100, "period":  "week","start_date": "today"}
}         
for budget in budgets:
    print(budgets[budget]["limit"])
    
list_1 = ["noname1","noname2","noname3"]
list_2 = ["name1","name2","name3"]

lst = [10, 20, 30]

for i in range(len(lst)):
    print(i, lst[i])
#output
# 0 10
# 1 20
# 2 30

test = ['10','20','30']
print(len(test))