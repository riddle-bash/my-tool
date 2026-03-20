import os
import shutil
import sys

def find_node_modules(root_path):
    """
    Recursively find all node_modules folders in the given path.
    
    Args:
        root_path: The root directory to search for node_modules folders
    
    Returns:
        List of paths to node_modules folders
    """
    node_modules_paths = []
    
    # Walk through all directories
    for dirpath, dirnames, filenames in os.walk(root_path, topdown=True):
        # Check if current directory contains node_modules
        if 'node_modules' in dirnames:
            node_modules_path = os.path.join(dirpath, 'node_modules')
            node_modules_paths.append(node_modules_path)
            # Remove from dirnames to prevent walking into it
            dirnames.remove('node_modules')
    
    return node_modules_paths

def delete_node_modules(paths):
    """
    Delete the given node_modules folders.
    
    Args:
        paths: List of paths to delete
    
    Returns:
        Tuple of (deleted_count, deleted_paths)
    """
    deleted_count = 0
    deleted_paths = []
    
    for path in paths:
        try:
            print(f"Deleting: {path}")
            shutil.rmtree(path)
            deleted_count += 1
            deleted_paths.append(path)
            print(f"✓ Successfully deleted: {path}")
        except Exception as e:
            print(f"✗ Error deleting {path}: {str(e)}")
    
    return deleted_count, deleted_paths

def main():
    # Get the target directory from command line argument or use current directory
    if len(sys.argv) > 1:
        target_path = sys.argv[1]
    else:
        target_path = os.getcwd()
    
    # Validate the path
    if not os.path.exists(target_path):
        print(f"Error: Path '{target_path}' does not exist.")
        sys.exit(1)
    
    if not os.path.isdir(target_path):
        print(f"Error: '{target_path}' is not a directory.")
        sys.exit(1)
    
    print(f"Searching for node_modules folders in: {target_path}")
    print("-" * 60)
    
    # Find all node_modules folders
    print("Scanning directories...")
    node_modules_paths = find_node_modules(target_path)
    
    if not node_modules_paths:
        print("No node_modules folders found.")
        sys.exit(0)
    
    # Display all found paths
    print(f"\nFound {len(node_modules_paths)} node_modules folder(s):")
    print("-" * 60)
    for i, path in enumerate(node_modules_paths, 1):
        print(f"{i}. {path}")
    
    print("-" * 60)
    # Confirm before deletion
    response = input(f"\nDelete all {len(node_modules_paths)} node_modules folders? (y/n): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    print("\nDeleting...")
    # Delete all folders
    deleted_count, deleted_paths = delete_node_modules(node_modules_paths)
    
    print("-" * 60)
    print(f"\nSummary:")
    print(f"Total node_modules folders deleted: {deleted_count}")
    
    if deleted_count > 0:
        print("\nDeleted folders:")
        for path in deleted_paths:
            print(f"  - {path}")

if __name__ == "__main__":
    main()
