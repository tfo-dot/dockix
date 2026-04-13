use std::path::Path;
use std::time::Duration;
use tokio::time;

pub fn start_sync_task(base_dir: std::path::PathBuf) {
    let interval_secs: u64 = std::env::var("DOCKIX_SYNC_INTERVAL_SECS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(6 * 60 * 60);

    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(interval_secs));
        interval.tick().await;

        loop {
            interval.tick().await;
            println!("Starting repo sync...");
            sync_all_repos(&base_dir);
            println!("Repo sync finished.");
        }
    });
}

fn sync_all_repos(base_dir: &Path) {
    let entries = match std::fs::read_dir(base_dir) {
        Ok(entries) => entries,
        Err(e) => {
            eprintln!("Failed to read repositories directory: {e}");
            return;
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_dir() || !path.join(".git").exists() {
            continue;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        match pull_repo(&path) {
            Ok(()) => println!("  Synced: {name}"),
            Err(e) => eprintln!("  Failed to sync {name}: {e}"),
        }
    }
}

fn pull_repo(path: &Path) -> Result<(), String> {
    let repo = git2::Repository::open(path)
        .map_err(|e| e.to_string())?;

    let mut remote = repo.find_remote("origin")
        .map_err(|e| e.to_string())?;

    remote.fetch(&["refs/heads/*:refs/remotes/origin/*"], None, None)
        .map_err(|e| e.to_string())?;

    let fetch_head = repo.find_reference("FETCH_HEAD")
        .map_err(|e| e.to_string())?;

    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)
        .map_err(|e| e.to_string())?;

    let (analysis, _) = repo.merge_analysis(&[&fetch_commit])
        .map_err(|e| e.to_string())?;

    if analysis.is_up_to_date() {
        return Ok(());
    }

    if analysis.is_fast_forward() {
        let reference = repo.find_reference("HEAD")
            .map_err(|e| e.to_string())?;

        let resolved = reference.resolve()
            .map_err(|e| e.to_string())?;

        let target = fetch_commit.id();
        let refname = resolved.name()
            .ok_or("Could not resolve HEAD")?;

        repo.reference(refname, target, true, "dockix: fast-forward sync")
            .map_err(|e| e.to_string())?;

        repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}