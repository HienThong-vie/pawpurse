from datetime import datetime,timedelta

def get_spending_by_category(transactions, budgets):
    spending = {}
    for transaction in transactions:
        if transaction["type"] == "expense" and transaction["category"] in budgets:
            category = transaction["category"]
            if transaction["category"] not in spending:
                spending[category] = 0
            spending[category] += transaction["amount"]
    return spending
# the first if condition check it the transaction type is expense and is there a category of this transaction inside budgets
# dont add break for this loop because we want to loop through all the transactions not one

def get_period_transaction(transactions, budget, category):
    period = budget[category]["period"]
    today = datetime.now()
    #get monday of the current week 
    if period == "week":
        period_start = today - timedelta(days=today.weekday())
    #get the first day of the current month
    elif period == "month":
        period_start = today.replace(day=1)
    transactions = [
        transaction for transaction in transactions
        if transaction["category"] == category
        and transaction["type"] == "expense"
        and datetime.strptime(transaction["time"], "%Y-%m-%d").date() >= period_start.date() #.date() filter the time componentas
    ]
    return transactions
# This function filters transactions to only those within the current budget period for a specific category.
# the date is only comparable in %Y-%m-%d format
# the transaction date must be greater or equal to start_day because we dont count days before we start tracking expense

def analyze_budgets(data):
    result = {}
    transactions = data["transactions"]
    budgets = data["budgets"]
    
    for budget in budgets: # this loop should return category string inside budgets
        period_transactions = get_period_transaction(transactions,budgets,budget)
        spending = get_spending_by_category(period_transactions,budget)
        spent = spending.get(budget,0) # get is a dict method parameter_of_get(get_what,return 0)
        limit = budgets[budget]["limit"]
        status = None
        if limit == 0:
            continue #break or return here is not suitable since it would continue running the remaining code
        else:
            remaining = int(limit) - int(spent)
            used_percentage = ((int(spent)/limit) * 100) 
            remaining_percentage = 100 - used_percentage
        if used_percentage >= 100:
            status = "exceeded"
        elif used_percentage >= 80:
            status = "warning"
        elif used_percentage >= 60:
            status = "caution"
        else:
            status = "acceptable"

        result[budget] = {
            "spent":spent,
            "limit":limit,
            "remaining":remaining,
            "used_percentage":used_percentage,
            "remaining_percentage":remaining_percentage,
            "status":status
            }
    return result 

def generate_advice(data):
    advices = []
    results = analyze_budgets(data)
    
    for result in results:
        status = results[result]["status"]
        used_percentage = results[result]["used_percentage"]
        used_percentage = round(used_percentage,1)
        period = data["budgets"][result]["period"]
        if status == "exceeded":
            advices.append(f"🔴 Alert: You have exceeded your {result} budget this {period}!")
        elif status == "warning":
            advices.append(f"⚠️ Warning: You have used {used_percentage}% of your {result} budget this {period}!")
        elif status == "caution":
            advices.append(f"🟡 Caution! You have used {used_percentage}% of your {result} this {period}.")
        else:
            advices.append(f"✅ Great job! You are on track with {result}.")
    return advices
# NEED FURTHER INVESTIGATION
def merge(left,right,key,reverse=False):
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        condition = left[i][key] <= right[j][key] if not reverse else left[i][key] >= right[j][key]
        if condition:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result += left[i:]
    result += right[j:]
    return result       

def merge_sort(list,key=None,reverse=False):
    if len(list) <= 1: # validate len(list)
        return list
    else:
        mid = len(list) // 2 # split the list in half
    # divide into left and right section 
    left_section = []
    right_section = []
    for i in range(len(list)): #check test.py for the example
        if i < mid:
            left_section.append(list[i])
        else:
            right_section.append(list[i])    
    left_section = merge_sort(left_section,key,reverse)
    right_section = merge_sort(right_section,key,reverse)
    return merge(left_section, right_section, key, reverse)
    
