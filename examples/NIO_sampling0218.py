# Goal: Sample 100 conversations from the ChatGPT and Gemini datasets respectively.


# Step 1: Connect to NIO's MinIO storage
import pandas as pd
import json
import niods
import numpy as np

storage_opts = niods.get_minio_storage_options()
mc = niods.get_minio_client()
#print("Connected to NIO's MinIO storage")

# Step 2: Load ChatGPT and Gemini conversation datasets
chatgpt_df = pd.read_parquet(
    f"s3://dataframes-llm/v0/chatgpt_df.parquet",
    engine='pyarrow',
    storage_options=storage_opts
)
print(f"ChatGPT dataset loaded: {len(chatgpt_df)} rows")

gemini_df = pd.read_parquet(
    "s3://dataframes-llm/v0/gemini_df.parquet",
    engine='pyarrow',
    storage_options=storage_opts
)
print(f"Gemini dataset loaded: {len(gemini_df)} rows")

# Step 3: Save the full ChatGPT and Gemini conversation datasets as: "chatgpt_full.csv" and "gemini_full.csv" respectively. and print "saved"
chatgpt_df.to_csv('chatgpt_full.csv', index=False)
gemini_df.to_csv('gemini_full.csv', index=False)
print("saved")

# Step 4: Statistics for these two datasets respectively, and print the results:
    # - Total number of conversations (total_conv_chatgpt, total_conv_gemini)
    # - Total number of unique users (total_users_chatgpt, total_users_gemini)
    # - Total number of unique users with more than 10 conversations (total_users_10plus_chatgpt, total_users_10plus_gemini)
    # - Time range of the conversations in the datasets (total_time_chatgpt, total_time_range_gemini)

# ChatGPT statistics
total_conv_chatgpt = len(chatgpt_df)
total_users_chatgpt = chatgpt_df['uid'].nunique()
uid_counts_chatgpt = chatgpt_df['uid'].value_counts()
total_users_10plus_chatgpt = len(uid_counts_chatgpt[uid_counts_chatgpt >= 10])
chatgpt_df['recorded_at'] = pd.to_datetime(chatgpt_df['recorded_at'])
total_time_chatgpt = f"{chatgpt_df['recorded_at'].min()} to {chatgpt_df['recorded_at'].max()}"

print("\n--- ChatGPT Statistics ---")
print(f"Total conversations: {total_conv_chatgpt}")
print(f"Total unique users: {total_users_chatgpt}")
print(f"Users with >10 conversations: {total_users_10plus_chatgpt}")
print(f"Time range: {total_time_chatgpt}")

# Gemini statistics
total_conv_gemini = len(gemini_df)
total_users_gemini = gemini_df['uid'].nunique()
uid_counts_gemini = gemini_df['uid'].value_counts()
total_users_10plus_gemini = len(uid_counts_gemini[uid_counts_gemini >= 10])
gemini_df['recorded_at'] = pd.to_datetime(gemini_df['recorded_at'])
total_time_range_gemini = f"{gemini_df['recorded_at'].min()} to {gemini_df['recorded_at'].max()}"

print("\n--- Gemini Statistics ---")
print(f"Total conversations: {total_conv_gemini}")
print(f"Total unique users: {total_users_gemini}")
print(f"Users with >10 conversations: {total_users_10plus_gemini}")
print(f"Time range: {total_time_range_gemini}")

# Step 5: Expands nested JSON conversations into flat DataFrames
def chat_to_df(conv):
    """takes a json-formatted chat conversation string, such as those in the chatGPT dataframe, returns a pandas dataframe with the information from the chat"""
    try:
        conv_df = pd.DataFrame(json.loads(conv))
        return conv_df
    except Exception as e:
        return None
    except TypeError as e:
        return None 

# Expand ChatGPT conversations
chatgpt_chats = []
for ind, row in chatgpt_df.iterrows():
    chat_df = chat_to_df(row['chatgpt_conversations_parsed'])
    if chat_df is not None:
        chat_df['chat_idx'] = ind
        chat_df['uid'] = row['uid']
        chat_df['recorded_at'] = row['recorded_at']
        chatgpt_chats.append(chat_df)

chatgpt_chats_df = pd.concat(chatgpt_chats, ignore_index=True)
print(f"ChatGPT expanded")

# Expand Gemini conversations
gemini_chats = []
for ind, row in gemini_df.iterrows():
    chat_df = chat_to_df(row['chat'])
    if chat_df is not None:
        chat_df['chat_idx'] = ind
        chat_df['uid'] = row['uid']
        chat_df['recorded_at'] = row['recorded_at']
        gemini_chats.append(chat_df)

gemini_chats_df = pd.concat(gemini_chats, ignore_index=True)
print(f"Gemini expanded")


# count and print the total turns in the whole ChatGPT and Gemini datasets.
total_turns_chatgpt = chatgpt_chats_df.groupby('chat_idx')['turn'].max().sum()
total_turns_gemini = gemini_chats_df.groupby('chat_idx')['turn'].max().sum()

print(f"\nTotal turns in whole ChatGPT dataset: {total_turns_chatgpt}")
print(f"Total turns in whole Gemini dataset: {total_turns_gemini}")

# Count and print the distribution of the number of turns per conversation for the whole ChatGPT and Gemini datasets.
import matplotlib.pyplot as plt

# ChatGPT: get max turn number per conversation
chatgpt_turns_per_conv = chatgpt_chats_df.groupby('chat_idx')['turn'].max()
chatgpt_turns_distribution = chatgpt_turns_per_conv.value_counts().sort_index()
total_chatgpt_convs = len(chatgpt_turns_per_conv)
print("whole ChatGPT: Distribution of turns per conv")
for turns, count in chatgpt_turns_distribution.items():
    percentage = (count / total_chatgpt_convs) * 100
    print(f"{turns} turn(s): {count} conversations ({percentage:.2f}%)")

# Gemini: get max turn number per conversation
gemini_turns_per_conv = gemini_chats_df.groupby('chat_idx')['turn'].max()
gemini_turns_distribution = gemini_turns_per_conv.value_counts().sort_index()
total_gemini_convs = len(gemini_turns_per_conv)
print("whole Gemini: Distribution of turns per conv")
for turns, count in gemini_turns_distribution.items():
    percentage = (count / total_gemini_convs) * 100
    print(f"{turns} turn(s): {count} conversations ({percentage:.2f}%)")

# Draw distribution diagram - both on same plot with percentages
fig, ax = plt.subplots(figsize=(12, 6))

# Convert to percentages
chatgpt_percentages = (chatgpt_turns_distribution / total_chatgpt_convs) * 100
gemini_percentages = (gemini_turns_distribution / total_gemini_convs) * 100

# Get all unique turn counts for x-axis
all_turns = sorted(set(chatgpt_turns_distribution.index) | set(gemini_turns_distribution.index))

# Reindex to have same x values, fill missing with 0
chatgpt_pct = chatgpt_percentages.reindex(all_turns, fill_value=0)
gemini_pct = gemini_percentages.reindex(all_turns, fill_value=0)

# Bar width and positions
bar_width = 0.4
x = np.arange(len(all_turns))

# Plot bars side by side
ax.bar(x - bar_width/2, chatgpt_pct.values, bar_width, label=f'ChatGPT (n={total_chatgpt_convs})', color='steelblue', alpha=0.8)
ax.bar(x + bar_width/2, gemini_pct.values, bar_width, label=f'Gemini (n={total_gemini_convs})', color='coral', alpha=0.8)

ax.set_xlabel('Number of Turns per Conversation')
ax.set_ylabel('Percentage of Conversations (%)')
ax.set_title('Distribution of Turns per Conversation: ChatGPT vs Gemini')
ax.set_xticks(x[::max(1, len(x)//20)])  # Show every nth tick to avoid crowding
ax.set_xticklabels([all_turns[i] for i in range(0, len(all_turns), max(1, len(all_turns)//20))])
ax.legend()
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()


# ------------------------------------------------------------------------------------------------

# Step 6: Cleans ChatGPT data. 

# Identify the "affected_turn": 
# A) turns with "chatbot" role and content is A1) empty, or A2) content contains ">4o", or A3) content contains ">ChatGPT said:", or A4) content contains "; will-change:"
# or B) turns with "user" role and content is B1) empty, or B2) content contains ""content":""}"
# or C) turns in the chat_idx "308", "600", "795", "798" and "1842".

# Remove the conversations with these "affected_turns"
# Statistics: number of "affected_turns_chatgpt", number of "affected_conv_chatgpt"

# Ensure content column is string type for proper comparison
chatgpt_chats_df['content'] = chatgpt_chats_df['content'].fillna('').astype(str)

# Identify affected turns
# A) Chatbot role with problematic content
affected_A = (
    (chatgpt_chats_df['role'] == 'chatbot') & 
    (
        (chatgpt_chats_df['content'] == '') |  # A1: empty
        (chatgpt_chats_df['content'].str.contains('>4o', na=False)) |  # A2
        (chatgpt_chats_df['content'].str.contains('>ChatGPT said:', na=False)) |  # A3
        (chatgpt_chats_df['content'].str.contains('; will-change:', na=False))  # A4
    )
)

# B) User role with problematic content
affected_B = (
    (chatgpt_chats_df['role'] == 'user') & 
    (
        (chatgpt_chats_df['content'] == '') |  # B1: empty
        (chatgpt_chats_df['content'].str.contains('"content":""}', na=False))  # B2
    )
)

# C) Specific chat_idx values to exclude
affected_chat_idx = [308, 600, 795, 798, 1842]
affected_C = chatgpt_chats_df['chat_idx'].isin(affected_chat_idx)

# Combine all criteria
affected_turns_mask = affected_A | affected_B | affected_C

# Count affected turns
affected_turns_chatgpt = affected_turns_mask.sum()

# Get chat_idx of conversations with affected turns
affected_conv_idx = chatgpt_chats_df.loc[affected_turns_mask, 'chat_idx'].unique()
affected_conv_chatgpt = len(affected_conv_idx)

# Remove conversations with affected turns
chatgpt_chats_cleaned_df = chatgpt_chats_df[~chatgpt_chats_df['chat_idx'].isin(affected_conv_idx)].copy()

print("\n--- ChatGPT Cleaning Statistics ---")
print(f"Number of affected turns: {affected_turns_chatgpt}")
print(f"Number of affected conversations: {affected_conv_chatgpt}")

# Distribution of affected turns by turn number (excluding Category C)
affected_turns_AB = affected_A | affected_B
affected_turn_numbers = chatgpt_chats_df.loc[affected_turns_AB, 'turn'].value_counts().sort_index()
print("\nAffected turns (Category A & B) by turn number:")
for turn_num, count in affected_turn_numbers.items():
    print(f"  Turn {turn_num}: {count} affected turns")

# Distribution of the first affected turn number across all affected conversations (A/B)
affected_AB_df = chatgpt_chats_df.loc[affected_turns_AB, ['chat_idx', 'turn']]
earliest_affected_per_conv = affected_AB_df.groupby('chat_idx')['turn'].min()
first_affected_distribution = earliest_affected_per_conv.value_counts().sort_index()
print(f"\nDistribution of first affected turn (Category A & B) across {len(earliest_affected_per_conv)} affected conversations:")
for turn_num, count in first_affected_distribution.items():
    percentage = (count / len(earliest_affected_per_conv)) * 100
    print(f"  First affected at turn {turn_num}: {count} conversations ({percentage:.1f}%)")

# Step 7: Statistics for the cleaned ChatGPT data:
# - number of conversations in the cleaned dataset (cleaned_conv_chatgpt)
# - number of unique users in the cleaned dataset (cleaned_users_chatgpt)
# - number of unique users with more than 10 conversations in the cleaned dataset (cleaned_users_10plus_chatgpt)
# - time range of the conversations in the cleaned dataset (cleaned_time_chatgpt)
# - count and print the total turns in the cleaned ChatGPT dataset.


cleaned_conv_chatgpt = chatgpt_chats_cleaned_df['chat_idx'].nunique()
cleaned_users_chatgpt = chatgpt_chats_cleaned_df['uid'].nunique()

# Count conversations per user in cleaned data
cleaned_uid_counts = chatgpt_chats_cleaned_df.groupby('uid')['chat_idx'].nunique()
cleaned_users_10plus_chatgpt = len(cleaned_uid_counts[cleaned_uid_counts >= 10])
cleaned_conv_from_10plus_users_chatgpt = cleaned_uid_counts[cleaned_uid_counts >= 10].sum()

# Time range of cleaned data
chatgpt_chats_cleaned_df['recorded_at'] = pd.to_datetime(chatgpt_chats_cleaned_df['recorded_at'])
cleaned_time_chatgpt = f"{chatgpt_chats_cleaned_df['recorded_at'].min()} to {chatgpt_chats_cleaned_df['recorded_at'].max()}"

# Total turns in cleaned ChatGPT dataset
cleaned_total_turns_chatgpt = chatgpt_chats_cleaned_df.groupby('chat_idx')['turn'].max().sum()

print("\n--- Cleaned ChatGPT Statistics ---")
print(f"Number of conversations: {cleaned_conv_chatgpt}")
print(f"Total turns in cleaned dataset: {cleaned_total_turns_chatgpt}")
print(f"Number of unique users: {cleaned_users_chatgpt}")
print(f"Users with >10 conversations: {cleaned_users_10plus_chatgpt}")
print(f"Total conversations from users with >10 conversations: {cleaned_conv_from_10plus_users_chatgpt}")
print(f"Time range: {cleaned_time_chatgpt}")



# ------------------------------------------------------------------------------------------------
# Use the same method to statistics the distribution of the number of turns per conversation for the cleaned ChatGPT dataset
# and use the same visualization method to compare the distribution of the number of turns per conversation for the cleaned ChatGPT dataset and the whole ChatGPT dataset.

# Cleaned ChatGPT: count turns per conversation
cleaned_chatgpt_turns_per_conv = chatgpt_chats_cleaned_df.groupby('chat_idx')['turn'].max()
cleaned_chatgpt_turns_distribution = cleaned_chatgpt_turns_per_conv.value_counts().sort_index()
total_cleaned_chatgpt_convs = len(cleaned_chatgpt_turns_per_conv)

print("\nCleaned ChatGPT: Distribution of turns per conv")
for turns, count in cleaned_chatgpt_turns_distribution.items():
    percentage = (count / total_cleaned_chatgpt_convs) * 100
    print(f"{turns} turn(s): {count} conversations ({percentage:.2f}%)")

# Draw comparison: Whole ChatGPT vs Cleaned ChatGPT
fig, ax = plt.subplots(figsize=(12, 6))

# Convert to percentages
whole_chatgpt_pct = (chatgpt_turns_distribution / total_chatgpt_convs) * 100
cleaned_chatgpt_pct = (cleaned_chatgpt_turns_distribution / total_cleaned_chatgpt_convs) * 100

# Get all unique turn counts for x-axis
all_turns = sorted(set(chatgpt_turns_distribution.index) | set(cleaned_chatgpt_turns_distribution.index))

# Reindex to have same x values, fill missing with 0
whole_pct = whole_chatgpt_pct.reindex(all_turns, fill_value=0)
cleaned_pct = cleaned_chatgpt_pct.reindex(all_turns, fill_value=0)

# Bar width and positions
bar_width = 0.4
x = np.arange(len(all_turns))

# Plot bars side by side
ax.bar(x - bar_width/2, whole_pct.values, bar_width, label=f'Whole ChatGPT (n={total_chatgpt_convs})', color='steelblue', alpha=0.8)
ax.bar(x + bar_width/2, cleaned_pct.values, bar_width, label=f'Cleaned ChatGPT (n={total_cleaned_chatgpt_convs})', color='seagreen', alpha=0.8)

ax.set_xlabel('Number of Turns per Conversation')
ax.set_ylabel('Percentage of Conversations (%)')
ax.set_title('Distribution of Turns per Conversation: Whole vs Cleaned ChatGPT')
ax.set_xticks(x[::max(1, len(x)//20)])
ax.set_xticklabels([all_turns[i] for i in range(0, len(all_turns), max(1, len(all_turns)//20))])
ax.legend()
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()

# ------------------------------------------------------------------------------------------------

# Step 8: Sample 100 conversations from the cleaned ChatGPT dataset and the Gemini dataset respectively
# Sampling method: 
#   1) Only sample from users with more than 10 conversations
#   2) Within those conversations, evenly sample by time range
# Save as: "chatgpt_sampled_100.csv" and "gemini_sampled_100.csv"

def sample_conversations_by_time(chats_df, uid_counts, n_samples=100):
    """
    Sample n_samples conversations evenly across time range from users with >10 conversations.
    
    Args:
        chats_df: DataFrame with expanded chat turns (has chat_idx, uid, recorded_at)
        uid_counts: Series with conversation counts per user
        n_samples: Number of conversations to sample
    
    Returns:
        DataFrame with sampled conversations (all turns from selected conversations)
    """
    # Get users with >10 conversations
    users_10plus = uid_counts[uid_counts >= 10].index
    
    # Filter to only conversations from these users
    eligible_df = chats_df[chats_df['uid'].isin(users_10plus)].copy()
    
    # Get unique conversations with their recorded_at time
    conv_times = eligible_df.groupby('chat_idx')['recorded_at'].first().reset_index()
    conv_times = conv_times.sort_values('recorded_at').reset_index(drop=True)
    
    # Sample evenly across time by selecting indices at regular intervals
    total_convs = len(conv_times)
    if total_convs <= n_samples:
        # If fewer conversations than requested, take all
        sampled_chat_idx = conv_times['chat_idx'].tolist()
    else:
        # Select evenly spaced indices
        indices = np.linspace(0, total_convs - 1, n_samples, dtype=int)
        sampled_chat_idx = conv_times.iloc[indices]['chat_idx'].tolist()
    
    # Get all turns from sampled conversations
    sampled_df = chats_df[chats_df['chat_idx'].isin(sampled_chat_idx)].copy()
    
    return sampled_df

# Sample ChatGPT conversations
chatgpt_sampled_df = sample_conversations_by_time(
    chatgpt_chats_cleaned_df, 
    cleaned_uid_counts, 
    n_samples=100
)
# Add chatgpt_id (1-100) as a short conversation identifier, sorted by recorded_at
chatgpt_sampled_df['recorded_at'] = pd.to_datetime(chatgpt_sampled_df['recorded_at'])
chatgpt_conv_times = chatgpt_sampled_df.groupby('chat_idx')['recorded_at'].first().reset_index()
chatgpt_conv_times = chatgpt_conv_times.sort_values('recorded_at').reset_index(drop=True)
chatgpt_conv_times['chatgpt_id'] = range(1, len(chatgpt_conv_times) + 1)
chatgpt_sampled_df = chatgpt_sampled_df.merge(chatgpt_conv_times[['chat_idx', 'chatgpt_id']], on='chat_idx', how='left')

chatgpt_sampled_df.to_csv('chatgpt_sampled_100.csv', index=False)
print(f"\n--- ChatGPT Sampling ---")
print(f"Sampled {chatgpt_sampled_df['chat_idx'].nunique()} conversations ({len(chatgpt_sampled_df)} turns)")

# Sample Gemini conversations
# First, compute uid counts for Gemini
gemini_uid_counts = gemini_chats_df.groupby('uid')['chat_idx'].nunique()
gemini_sampled_df = sample_conversations_by_time(
    gemini_chats_df, 
    gemini_uid_counts, 
    n_samples=100
)
# Add gemini_id (1-100) as a short conversation identifier, sorted by recorded_at
gemini_sampled_df['recorded_at'] = pd.to_datetime(gemini_sampled_df['recorded_at'])
gemini_conv_times = gemini_sampled_df.groupby('chat_idx')['recorded_at'].first().reset_index()
gemini_conv_times = gemini_conv_times.sort_values('recorded_at').reset_index(drop=True)
gemini_conv_times['gemini_id'] = range(1, len(gemini_conv_times) + 1)
gemini_sampled_df = gemini_sampled_df.merge(gemini_conv_times[['chat_idx', 'gemini_id']], on='chat_idx', how='left')

gemini_sampled_df.to_csv('gemini_sampled_100.csv', index=False)
print(f"\n--- Gemini Sampling ---")
print(f"Sampled {gemini_sampled_df['chat_idx'].nunique()} conversations ({len(gemini_sampled_df)} turns)")



# ------------------------------------------------------------------------------------------------
# Step 9: Quick checks
# Print the 11-20th rows in the sampled datasets to check the data quality

pd.set_option('display.max_rows', None)
pd.set_option('display.max_colwidth', 50)  # Limit column width to 50 characters
pd.set_option('display.width', 150)  # Total display width
pd.set_option('display.expand_frame_repr', True)  # Allow wrapping to multiple lines
pd.set_option('display.colheader_justify', 'left')  # Left-align column headers

# ChatGPT sampled data (rows 11-20)
chatgpt_sampled_df.iloc[10:20].style.set_properties(**{'text-align': 'left'})

# Gemini sampled data (rows 11-20)
gemini_sampled_df.iloc[10:20].style.set_properties(**{'text-align': 'left'})


# ------------------------------------------------------------------------------------------------
# Use the same method to statistics the distribution of the number of turns per conversation for the sampled ChatGPT dataset
# and use the same visualization method to compare the distribution of the number of turns per conversation for the sampled ChatGPT dataset vs the cleaned ChatGPT dataset vs the whole ChatGPT dataset.

# Sampled ChatGPT: count turns per conversation
sampled_chatgpt_turns_per_conv = chatgpt_sampled_df.groupby('chat_idx')['turn'].max()
sampled_chatgpt_turns_distribution = sampled_chatgpt_turns_per_conv.value_counts().sort_index()
total_sampled_chatgpt_convs = len(sampled_chatgpt_turns_per_conv)

print("\nSampled ChatGPT: Distribution of turns per conv")
for turns, count in sampled_chatgpt_turns_distribution.items():
    percentage = (count / total_sampled_chatgpt_convs) * 100
    print(f"{turns} turn(s): {count} conversations ({percentage:.2f}%)")

# Draw comparison: Whole vs Cleaned vs Sampled ChatGPT
fig, ax = plt.subplots(figsize=(14, 6))

# Convert to percentages
whole_chatgpt_pct = (chatgpt_turns_distribution / total_chatgpt_convs) * 100
cleaned_chatgpt_pct = (cleaned_chatgpt_turns_distribution / total_cleaned_chatgpt_convs) * 100
sampled_chatgpt_pct = (sampled_chatgpt_turns_distribution / total_sampled_chatgpt_convs) * 100

# Get all unique turn counts for x-axis
all_turns = sorted(set(chatgpt_turns_distribution.index) | set(cleaned_chatgpt_turns_distribution.index) | set(sampled_chatgpt_turns_distribution.index))

# Reindex to have same x values, fill missing with 0
whole_pct = whole_chatgpt_pct.reindex(all_turns, fill_value=0)
cleaned_pct = cleaned_chatgpt_pct.reindex(all_turns, fill_value=0)
sampled_pct = sampled_chatgpt_pct.reindex(all_turns, fill_value=0)

# Bar width and positions
bar_width = 0.25
x = np.arange(len(all_turns))

# Plot bars side by side
ax.bar(x - bar_width, whole_pct.values, bar_width, label=f'Whole ChatGPT (n={total_chatgpt_convs})', color='steelblue', alpha=0.8)
ax.bar(x, cleaned_pct.values, bar_width, label=f'Cleaned ChatGPT (n={total_cleaned_chatgpt_convs})', color='seagreen', alpha=0.8)
ax.bar(x + bar_width, sampled_pct.values, bar_width, label=f'Sampled ChatGPT (n={total_sampled_chatgpt_convs})', color='coral', alpha=0.8)

ax.set_xlabel('Number of Turns per Conversation')
ax.set_ylabel('Percentage of Conversations (%)')
ax.set_title('Distribution of Turns per Conversation: Whole vs Cleaned vs Sampled ChatGPT')
ax.set_xticks(x[::max(1, len(x)//20)])
ax.set_xticklabels([all_turns[i] for i in range(0, len(all_turns), max(1, len(all_turns)//20))])
ax.legend()
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()

# ------------------------------------------------------------------------------------------------

# Use the same method to statistics the distribution of the number of turns per conversation for the sampled Gemini dataset
# and use the same visualization method to compare the distribution of the number of turns per conversation for the sampled Gemini dataset vs the whole Gemini dataset.

# Sampled Gemini: get max turn number per conversation
sampled_gemini_turns_per_conv = gemini_sampled_df.groupby('chat_idx')['turn'].max()
sampled_gemini_turns_distribution = sampled_gemini_turns_per_conv.value_counts().sort_index()
total_sampled_gemini_convs = len(sampled_gemini_turns_per_conv)

print("\nSampled Gemini: Distribution of turns per conv")
for turns, count in sampled_gemini_turns_distribution.items():
    percentage = (count / total_sampled_gemini_convs) * 100
    print(f"{turns} turn(s): {count} conversations ({percentage:.2f}%)")

# Draw comparison: Whole Gemini vs Sampled Gemini
fig, ax = plt.subplots(figsize=(12, 6))

# Convert to percentages
whole_gemini_pct = (gemini_turns_distribution / total_gemini_convs) * 100
sampled_gemini_pct = (sampled_gemini_turns_distribution / total_sampled_gemini_convs) * 100

# Get all unique turn counts for x-axis
all_turns = sorted(set(gemini_turns_distribution.index) | set(sampled_gemini_turns_distribution.index))

# Reindex to have same x values, fill missing with 0
whole_gemini_pct = whole_gemini_pct.reindex(all_turns, fill_value=0)
sampled_gemini_pct = sampled_gemini_pct.reindex(all_turns, fill_value=0)

# Bar width and positions
bar_width = 0.4
x = np.arange(len(all_turns))

# Plot bars side by side
ax.bar(x - bar_width/2, whole_gemini_pct.values, bar_width, label=f'Whole Gemini (n={total_gemini_convs})', color='coral', alpha=0.8)
ax.bar(x + bar_width/2, sampled_gemini_pct.values, bar_width, label=f'Sampled Gemini (n={total_sampled_gemini_convs})', color='gold', alpha=0.8)

ax.set_xlabel('Number of Turns per Conversation')
ax.set_ylabel('Percentage of Conversations (%)')
ax.set_title('Distribution of Turns per Conversation: Whole vs Sampled Gemini')
ax.set_xticks(x[::max(1, len(x)//20)])
ax.set_xticklabels([all_turns[i] for i in range(0, len(all_turns), max(1, len(all_turns)//20))])
ax.legend()
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()


# ------------------------------------------------------------------------------------------------

# Statistics for the sampled datasets:
# - number of conversations in the sampled dataset (sampled_conv_chatgpt, sampled_conv_gemini)
# - number of unique users in the sampled dataset (sampled_users_chatgpt, sampled_users_gemini)
# - the average number of conversations per user in the sampled dataset (avg_conv_per_user_chatgpt, avg_conv_per_user_gemini)
# - time range of the conversations in the sampled dataset (sampled_time_chatgpt, sampled_time_gemini)

# Sampled ChatGPT statistics
sampled_conv_chatgpt = chatgpt_sampled_df['chat_idx'].nunique()
sampled_users_chatgpt = chatgpt_sampled_df['uid'].nunique()
sampled_conv_per_user_chatgpt = chatgpt_sampled_df.groupby('uid')['chat_idx'].nunique()
avg_conv_per_user_chatgpt = sampled_conv_per_user_chatgpt.mean()
sampled_total_turns_chatgpt = chatgpt_sampled_df.groupby('chat_idx')['turn'].max().sum()
chatgpt_sampled_df['recorded_at'] = pd.to_datetime(chatgpt_sampled_df['recorded_at'])
sampled_time_chatgpt = f"{chatgpt_sampled_df['recorded_at'].min()} to {chatgpt_sampled_df['recorded_at'].max()}"

print("\n--- Sampled ChatGPT Statistics ---")
print(f"Number of conversations: {sampled_conv_chatgpt}")
print(f"Number of unique users: {sampled_users_chatgpt}")
print(f"Average conversations per user: {avg_conv_per_user_chatgpt:.2f}")
print(f"Total turns in sampled conversations: {sampled_total_turns_chatgpt}")
print(f"Time range: {sampled_time_chatgpt}")

# Sampled Gemini statistics
sampled_conv_gemini = gemini_sampled_df['chat_idx'].nunique()
sampled_users_gemini = gemini_sampled_df['uid'].nunique()
sampled_conv_per_user_gemini = gemini_sampled_df.groupby('uid')['chat_idx'].nunique()
avg_conv_per_user_gemini = sampled_conv_per_user_gemini.mean()
sampled_total_turns_gemini = gemini_sampled_df.groupby('chat_idx')['turn'].max().sum()
gemini_sampled_df['recorded_at'] = pd.to_datetime(gemini_sampled_df['recorded_at'])
sampled_time_gemini = f"{gemini_sampled_df['recorded_at'].min()} to {gemini_sampled_df['recorded_at'].max()}"

print("\n--- Sampled Gemini Statistics ---")
print(f"Number of conversations: {sampled_conv_gemini}")
print(f"Number of unique users: {sampled_users_gemini}")
print(f"Average conversations per user: {avg_conv_per_user_gemini:.2f}")
print(f"Total turns in sampled conversations: {sampled_total_turns_gemini}")
print(f"Time range: {sampled_time_gemini}")
