import os 
import json
import uuid
#from utils.today import get_today_string
from datetime import datetime
from core.algorithm import merge_sort
# DATA_FILE ennsuring build the correct path regardless of where Python is run from
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "data", "transactions.json") #this is a constant vaiable, it written in ALL_CAPS and we can not change this variable
def load_data(): 
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as data_file:
            data = json.load(data_file)   #json.load() convert unsuitable data to a suitable data for python language 
            return data
    else:
        return {
            "transactions": [],
            "budgets": {},
            "categories": [
        "food",
        "rent",
        "transport",
        "shopping",
        "supplement",
        "drinks"
        ]
    }

def save_data(data):
    with open(DATA_FILE, "w") as data_file:
        json.dump(data, data_file, indent=4) # it save data of parameter data locates in data_file

#the third parameter in saveData is just for spacing for each level ->  make the ouput look cleaner, 4 is standard

def add_transaction(data,amount,transaction_type,category,note):
    transaction_id = str(uuid.uuid4())
    #today = get_today_string()

    new_transaction = {
        "id":transaction_id,
        "time":datetime.now().strftime("%Y-%m-%d"),
        "amount":amount,
        "type": transaction_type,
        "note": note,
        "category": category
    }
    data["transactions"].append(new_transaction)
    save_data(data)

def delete_transaction(transaction_id, data):
    for transaction in data["transactions"]:
        if transaction_id == transaction["id"]:
            data["transactions"].remove(transaction)
            save_data(data)
            break
# remove() only work for list
def edit_transaction(data,transaction_id,updated_field):
    matching_transaction = None
    for transaction in data["transactions"]:
        if transaction_id == transaction["id"]:
            matching_transaction = transaction
            break 
    if matching_transaction is not None: # make sure this variable is not undefine
            matching_transaction.update(updated_field)
            save_data(data)

#.update() helps update the dict and keep everything untouch

def get_transaction(data,search_query=None,sort_by="time",ascending=False):
    transactions =  data["transactions"]
    if search_query is not None:
        search_query = search_query.lower()
        transactions = [
            transaction for transaction in transactions 
                if search_query in transaction["time"].lower()
                or search_query in transaction["note"].lower()
                or search_query in transaction["type"].lower()
                or search_query in transaction["category"].lower()
                or search_query in str(transaction["amount"])
            ]
    transactions = merge_sort(transactions,sort_by, reverse= not ascending)
    return transactions
# sort_by="time" by default make all transaction shows synchronously 
# we will use list comprehension to build list as a compact way
# example of use in "food" in "my food budget"
# sorted() make a list return new sorted list, in this case sorted(transactions) will return list contains information match search_query
# the parameter ascending and reverse must always be opposite to each other  
# this function must always sorted regard there is search_query or not

def add_budget(data,category,limit,period):
    category = category.lower()
    data["budgets"][category] = {"limit": limit,"period": period,"start_date":datetime.now().strftime("%Y-%m-%d")}
    save_data(data)
#we access budget category and add new value in this function

def delete_budget(data,category):
    category = category.lower()
    if category in data["budgets"]:
        del data["budgets"][category]
        save_data(data)
# we remove budget category sorted by category parameter

def get_budget(data):
    return data["budgets"]
#get budget simply by accessing the data["budgets"]

def add_category(data,category):
    category = category.lower()
    if category in data["categories"]:
        return
    else:
        data["categories"].append(category)
        save_data(data)
# add category by checking if the category name existed inside the list, if not, add it to the list
def get_categories(data):
    return data["categories"]
#return categories list in data

def remove_category(data,category):
    if category in data["categories"]:
        data["categories"].remove(category)
        save_data(data)
        