import tkinter as tk
import tkinter.ttk as ttk
from colors_scheme import COLORS
from datetime import datetime
from core.data_manager import (
    get_transaction,
    add_transaction,
    edit_transaction,
    delete_transaction,
    get_budget,
    get_categories,
    delete_budget,
    add_category,
    save_data,
    remove_category
)
def build_transactions_page(frame, data):
    def open_category_popup():
        def delete_category():
            category  = remove_combobox.get()
            budget = get_budget(data)

            has_transactions = any(transaction["category"] ==  category for transaction in data["transactions"]) #any() will return boolean value
            has_budget = category in budget
            if category == "":
                return
            elif has_transactions or has_budget:
                    def confirm_delete():
                        data["transactions"] = [transaction for transaction in data["transactions"] if transaction["category"] != category] # only keep category that not be removed
                        save_data(data)
                        delete_budget(data,category)
                        remove_category(data,category)
                        remove_combobox.set("")
                        remove_combobox.config(values=get_categories(data))
                        warning_popup.destroy()
                        refresh_table()
                    warning_popup = tk.Toplevel(
                        popup,
                        bg=COLORS["bg_main"]
                    )
                    tk.Label(
                        warning_popup,
                        text=f"⚠️ Deleting '{category}' will also remove \n all related transactions and budget!",
                        bg=COLORS["bg_main"],
                        fg=COLORS["text_primary"],
                        font=("Segoe UI", 10)
                    ).pack(padx=20, pady=10)
                    tk.Button(
                        warning_popup,
                        text="✅ Confirm Delete",
                        command=confirm_delete,
                        bg=COLORS["status_exceeded"],
                        fg=COLORS["text_light"],
                        font=("Segoe UI", 10, "bold"),
                        relief="solid",
                        bd=1,
                        cursor="hand2",
                        width=20
                    ).pack(padx=20,pady=5)
                    tk.Button(
                        warning_popup,
                        text="❌ Cancel",
                        command=warning_popup.destroy,
                        bg=COLORS["accent"],
                        fg=COLORS["text_light"],
                        font=("Segoe UI", 10, "bold"),
                        relief="solid",
                        bd=1,
                        cursor="hand2",
                        width=20
                    ).pack(padx=20,pady=5)
            else:
                remove_category(data,category)
                remove_combobox.set("")
                remove_combobox.config(values=get_categories(data))
        def save_category():
            new_category = category_var.get().strip().lower()
            if new_category == "":
                return
            else:
                add_category(data,new_category)
                category_combobox.config(values=get_categories(data))
                save_data(data)
                popup.destroy()
        category_var = tk.StringVar()
        category_var.set("")
        popup = tk.Toplevel(
            frame,
            bg=COLORS["bg_main"],
            )
        popup.title("Add Category")
        popup.resizable(False,False) 
        tk.Label(
            popup,
            text="Category Name:",
            bg=COLORS["bg_main"],
            fg=COLORS["text_primary"],
            font=("Segoe UI", 10)  
            ).pack(padx=10,pady=5),
        tk.Entry(
            popup,
            textvariable=category_var,
        ).pack(padx=20,pady=10)
        tk.Button(
            popup,
            text="✅ Save",
            command=save_category,
            bg=COLORS["accent"],
            fg=COLORS["text_light"],
            font=("Segoe UI", 10, "bold"),
            relief="solid",
            bd=1,
            cursor="hand2",
            width=20
        ).pack(padx=20,pady=5)
        tk.Frame(
            popup,
            height=2,
            bg=COLORS["text_secondary"]
        ).pack(padx=10,pady=5)
        tk.Label(
            popup,
            text="Remove Category",
            bg=COLORS["bg_main"],
            fg=COLORS["text_primary"],
            font=("Segoe UI", 10)
        ).pack(padx=10,pady=5)
        remove_combobox = ttk.Combobox(
            popup,
            values=get_categories(data),
            state="readonly"
        )
        remove_combobox.pack(padx=20,pady=10)
        tk.Button(
            popup,
            text="🗑️ Remove",
            command= delete_category,
            bg=COLORS["status_exceeded"],
            fg=COLORS["text_light"],
            font=("Segoe UI", 10, "bold"),
            relief="solid",
            bd=1,
            cursor="hand2",
            width=20
        ).pack(padx=20,pady=5)
        tk.Button(
            popup,
            text="❌ Cancel",
            command= popup.destroy,
            bg=COLORS["bg_sidebar"],
            fg=COLORS["text_light"],
            font=("Segoe UI", 10, "bold"),
            relief="solid",
            bd=1,
            cursor="hand2",
            width=10
            ).pack(padx=20,pady=20)
        popup.grab_set() #can only interact with the popup
        

    def search_and_sort():
        search_item = search_var.get().lower()
        sort_item = sort_combobox.get()
        sort_map= {
            "Date" : "time",
            "Amount" : "amount",
            "Category" : "category",
            "Type" : "type"
        }  # this sort_map translate into readable data for get_transactions()
        sort_key = sort_map.get(sort_item,"time")
        transactions = get_transaction(data,search_item,sort_key)
        transaction_history.delete(*transaction_history.get_children()) # this delete all children widget (columns) inside a tree widget
        for transaction in transactions:
            transaction_history.insert("",tk.END,values=(
                transaction["id"],
                transaction["time"],
                transaction["type"],
                transaction["category"],
                transaction["amount"],
                transaction["note"]
            ))

    def edit_selected():
        selected_row = transaction_history.selection()
        if selected_row:
            values = transaction_history.item(selected_row[0])["values"]
        else:
            return
        transaction_id = values[0]
        date = values[1]
        transaction_type = values[2]
        category = values[3]
        amount = values[4]
        note = values[5]

        amount_entry.delete(0,tk.END)
        note_entry.delete(0,tk.END)
        date_entry.delete(0,tk.END)

        date_entry.insert(0,date)
        type_combobox.set(transaction_type)
        category_combobox.set(category)
        amount_entry.insert(0,amount)
        note_entry.insert(0,note)

        name_var.set("Update Transaction")
        edit_id.set(transaction_id)

        
    def delete_selected():
        selected_row = transaction_history.selection() # this return the id of a row 
        if selected_row:
            values = transaction_history.item(selected_row[0])["values"]
        else:
            return 
        transaction_id = values[0]

        delete_transaction(transaction_id,data)
        refresh_table()

    # this function, check the transactions data to see any changes then print data on page again
    def refresh_table():
        search_and_sort()

    def submit_transaction():
        try: # we try the input to make sure it is an integer first
            amount = int(float(amount_entry.get()))
        except: # if not integer, return imidiatly without crashing
            return 
        category = category_combobox.get()
        type = type_combobox.get()
        note = note_entry.get()
        current_id = edit_id.get()
        time = date_entry.get()
        updated_field = {
            "amount":amount,
            "type":type,
            "category":category,
            "note":note,
            "time":time
            }
        
        if current_id:
            edit_transaction(data,current_id,updated_field)
        else:
            add_transaction(data,amount,type,category,note)

        name_var.set("➕ Add Transaction")
        edit_id.set("")
        delete_fields()
        refresh_table()

    def delete_fields():
        amount_entry.delete(0,tk.END)
        category_combobox.set("") # to delete combobox, we use set() with an empty string
        type_combobox.set("")
        note_entry.delete(0,tk.END)

    # widgets section
    page_title = tk.Label(
        frame,
        text = "💸 Transactions",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font = ("Segoe UI", 18, "bold")
    )
    form_frame = tk.LabelFrame( # LabelFrame create a form with visible border
        frame,
        text="ADD TRANSACTION",
        bg=COLORS["bg_main"],
        fg=COLORS["text_secondary"],
        font=("Segoe UI", 10, "bold"),
        padx=15,
        pady=10,   
    )
    amount_label = tk.Label(
        form_frame,
        text = "Amount:",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)  
    )
    amount_entry = tk.Entry(
        form_frame,
    )
    category_label = tk.Label(
        form_frame,
        text = "Category",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)        
    )
    # combox is just basically a drop down input
    category_combobox = ttk.Combobox(
        form_frame,
        values=get_categories(data),
        state="readonly"
    )
    type_label = tk.Label(
        form_frame,
        text = "Type",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)
    )
    type_combobox = ttk.Combobox(
        form_frame,
        values = ["expense","income"],
        state="readonly"
    )
    date_label = tk.Label(
        form_frame,
        text = "Date:",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)
    )
    date_entry = tk.Entry(
        form_frame
    )
    date_entry.insert(0,datetime.now().strftime("%Y-%m-%d"))
    note_label = tk.Label(
        form_frame,
        text = "Note (Optional)",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)
    )
    note_entry = tk.Entry(
        form_frame,
    )
    sub_add_frame = tk.Frame(
        form_frame,
        bg=COLORS["bg_main"]
    )
    name_var = tk.StringVar()
    edit_id = tk.StringVar()
    edit_id.set("")
    name_var.set("Add Transaction")
    submit_button = tk.Button(
        sub_add_frame,
        command=submit_transaction,
        textvariable=name_var,
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10, "bold"),
        relief="solid",
        bd=1,
        cursor="hand2",
        width=20
    )
    add_category_button = tk.Button(
        sub_add_frame,
        command=open_category_popup,
        text = "Edit Category",
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10, "bold"),
        relief="solid",
        bd=1,
        cursor="hand2",
        width=20
    )
    """done transaction section"""
    controls_frame = tk.Frame(
        frame,
        bg = COLORS["bg_main"]
    )
    delete_button = tk.Button(
        controls_frame,
        command = delete_selected,
        text = "🗑️ Delete",
        bg=COLORS["status_exceeded"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        relief="solid",
        bd=1,
        cursor="hand2",
        width=13
    )
    edit_button = tk.Button(
        controls_frame,
        command=edit_selected,
        text = "✏️ Edit Transactions",
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        relief="solid",
        bd=1,
        cursor="hand2",
    )
    #done controls frame
    search_frame = tk.Frame(
        frame,
        bg=COLORS["bg_main"]
    )
    search_label = tk.Label(
        search_frame,
        text="Search:",
        font=("Segoe UI", 10),
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"]
    )
    search_var = tk.StringVar()
    search_var.set("")
    search_bar = tk.Entry(
        search_frame,
        textvariable=search_var,
        relief="solid",
        bd=1
    )
    sort_label = tk.Label(
        search_frame,
        text="Sort by:",
        font=("Segoe UI", 10),
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"]
    )
    sort_combobox = ttk.Combobox(
        search_frame,
        values = ["Date","Amount","Category","Type"],
        state="readonly"
    )
    sort_combobox.set("Date")
    #done search frame
    history_frame = tk.LabelFrame(
        frame,
        text="TRANSACTION HISTORY",
        bg=COLORS["bg_main"],
        fg=COLORS["text_secondary"],
        font=("Segoe UI", 10, "bold"),
    )
    transaction_history = ttk.Treeview (
        history_frame,
        columns = ("id","date","type","category","amount","note"),
        show="headings"
    )
    transaction_history_scrollbar = ttk.Scrollbar(
        history_frame,
        command=transaction_history.yview,
        orient="vertical"
    )
    #done transaction history frame
    #ttk widget need style() to styling them
    style = ttk.Style()
    style.configure("Treeview",rowheight=50,font=("Segoe UI", 10))
    style.configure("Treeview.Heading", font=("Segoe UI", 10))
    transaction_history.configure(yscrollcommand=transaction_history_scrollbar.set)
    # define column heading
    transaction_history.heading("id",text="")
    transaction_history.heading("date", text="Date")
    transaction_history.heading("type", text="Type")
    transaction_history.heading("category", text="Category")
    transaction_history.heading("amount", text="Amount")
    transaction_history.heading("note", text="Note")
    # defind column width
    transaction_history.column("id",width=0,stretch=False)
    transaction_history.column("date", width=90,minwidth=80, anchor="center")
    transaction_history.column("type", width=80,minwidth=70, anchor="center")
    transaction_history.column("category", width=90,minwidth=80, anchor="center")
    transaction_history.column("amount", width=80,minwidth=70, anchor="center")
    transaction_history.column("note", width=150,minwidth=100, anchor="w",stretch=tk.YES)
    # insert a row 
    # transaction frame section
    page_title.pack(anchor="w",padx=20,pady=15)
    form_frame.pack(fill="x", padx=20, pady=10) # we dont add fill both here because this frame have fixed height created by all the widget inside this frame
    
    amount_label.grid(row=0, column=0, sticky="w",pady=5)
    amount_entry.grid(row=0, column=1, sticky="ew",padx=20,pady=5)

    category_label.grid(row=1, column=0, sticky="w",pady=5)
    category_combobox.grid(row=1, column=1, sticky="ew",padx=20,pady=5)

    type_label.grid(row=2, column=0, sticky="w",pady=5)
    type_combobox.grid(row=2, column=1, sticky="ew",padx=20,pady=5)

    date_label.grid(row=3, column=0, sticky="w",pady=5)
    date_entry.grid(row=3, column=1, sticky="ew",padx=20,pady=5)

    note_label.grid(row=4, column=0, sticky="w",pady=5)
    note_entry.grid(row=4, column=1, sticky="ew",padx=20,pady=5)

    sub_add_frame.grid(row=5,column=1,sticky="ew",padx=20,pady=10)
    submit_button.pack(side="right",padx=5)
    add_category_button.pack(side="right",padx=5)

    form_frame.columnconfigure(1, weight=1)
    # controls frame section
    controls_frame.pack(fill="x",padx=20,pady=5)
    delete_button.pack(side="right",padx=5)
    edit_button.pack(side="right",padx=5)
    # search frame section
    search_frame.pack(fill="x",padx=10,pady=10)
    search_label.pack(side="left",fill="x")
    search_bar.pack(side="left",fill="x",expand=True,padx=10)
    sort_label.pack(side="left",fill="x")
    sort_combobox.pack(side="right",fill="x",padx=10)

    search_var.trace_add("write", lambda *args: search_and_sort()) # this line means update wheever user type something
    sort_combobox.bind("<<ComboboxSelected>>", lambda e: search_and_sort()) # this line update the transactions history base on the selected category inside the combobox
    # history frame section
    history_frame.pack(fill="both",expand=True,padx=20,pady=10)
    transaction_history_scrollbar.pack(side="right", fill="y")# we need to fill both because this frame will take all the remaining page of screen, leaving no blank space
    transaction_history.pack(fill="both",expand=True,padx=10,pady=10)

    refresh_table() #this generate fresh start to our program whenever we run it
    
