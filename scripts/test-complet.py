#!/usr/bin/env python3
"""
Test complet du système de concours de pétanque
- Mode MELEE: joueurs individuels mélangés en équipes
- Mode MONTE: équipes pré-formées

Usage:
  python3 test-complet.py                    # Tous les tests
  python3 test-complet.py melee              # Tests mode Mélée uniquement
  python3 test-complet.py monte              # Tests mode Monté uniquement
  python3 test-complet.py melee 12 DOUBLETTE # Test spécifique Mélée
  python3 test-complet.py monte 8 TRIPLETTE  # Test spécifique Monté
"""

import json
import subprocess
import sys
import time

BASE_URL = 'http://localhost:3000'

def api_call(method, endpoint, data=None):
    cmd = ['curl', '-s']
    if method != 'GET':
        cmd.extend(['-X', method])
    cmd.append(f'{BASE_URL}{endpoint}')
    cmd.extend(['-H', 'Content-Type: application/json'])
    if data:
        cmd.extend(['-d', json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {'error': 'Parse error', 'raw': result.stdout[:500]}

# =============================================================================
# MODE MELEE
# =============================================================================

def test_melee(num_players, team_type='DOUBLETTE'):
    """Test du mode Mélée avec un nombre de joueurs donné"""
    type_label = {'TETE_A_TETE': 'Tête-à-tête', 'DOUBLETTE': 'Doublette', 'TRIPLETTE': 'Triplette'}.get(team_type, team_type)
    players_per_team = {'TETE_A_TETE': 1, 'DOUBLETTE': 2, 'TRIPLETTE': 3}.get(team_type, 2)

    print(f"\n{'='*60}")
    print(f"TEST MÉLÉE {type_label.upper()} - {num_players} JOUEURS")
    print(f"{'='*60}")

    errors = []

    # 1. Créer le concours en mode MELEE
    contest_data = {
        'name': f'Test Mélée {type_label} {num_players} joueurs',
        'teamType': team_type,
        'gameMode': 'MELEE'
    }
    result = api_call('POST', '/api/contests', contest_data)
    if 'error' in result or 'id' not in result:
        print(f"❌ Erreur création concours: {result}")
        return False, ["Création concours échouée"]

    contest_id = result['id']
    print(f"✅ Concours créé: {contest_id[:8]}...")

    # 2. Ajouter les joueurs
    for i in range(1, num_players + 1):
        r = api_call('POST', f'/api/contests/{contest_id}/melee-players', {'name': f'Joueur{i}'})
        if 'error' in r:
            errors.append(f"Erreur ajout joueur {i}: {r}")

    # Vérifier les joueurs
    contest = api_call('GET', f'/api/contests/{contest_id}')
    players_count = len(contest.get('players', []))
    expected_teams = num_players // players_per_team
    print(f"✅ {players_count} joueurs ajoutés → {expected_teams} équipes attendues")

    if players_count != num_players:
        errors.append(f"Nombre de joueurs incorrect: {players_count} au lieu de {num_players}")

    # 3. Générer le tirage
    result = api_call('POST', f'/api/contests/{contest_id}/draw')
    if 'error' in result:
        print(f"❌ Erreur génération tirage: {result}")
        api_call('DELETE', f'/api/contests/{contest_id}')
        return False, [f"Génération tirage échouée: {result}"]

    print(f"✅ Tirage généré")

    # Vérifier les équipes créées
    contest = api_call('GET', f'/api/contests/{contest_id}')
    teams_count = len(contest.get('teams', []))
    print(f"   {teams_count} équipes formées")

    if teams_count != expected_teams:
        errors.append(f"Nombre d'équipes incorrect: {teams_count} au lieu de {expected_teams}")

    # Jouer les matchs et vérifier
    success, play_errors = play_all_matches(contest_id)
    errors.extend(play_errors)

    # Nettoyer
    api_call('DELETE', f'/api/contests/{contest_id}')
    print(f"\n🗑️  Concours supprimé")

    final_success = success and len(errors) == 0
    print_result(final_success, num_players, errors, "JOUEURS")
    return final_success, errors

# =============================================================================
# MODE MONTE
# =============================================================================

def test_monte(num_teams, team_type='DOUBLETTE'):
    """Test du mode Monté avec un nombre d'équipes donné"""
    type_label = {'TETE_A_TETE': 'Tête-à-tête', 'DOUBLETTE': 'Doublette', 'TRIPLETTE': 'Triplette'}.get(team_type, team_type)
    players_per_team = {'TETE_A_TETE': 1, 'DOUBLETTE': 2, 'TRIPLETTE': 3}.get(team_type, 2)

    print(f"\n{'='*60}")
    print(f"TEST MONTÉ {type_label.upper()} - {num_teams} ÉQUIPES")
    print(f"{'='*60}")

    errors = []

    # 1. Créer le concours en mode MONTE
    contest_data = {
        'name': f'Test Monté {type_label} {num_teams} équipes',
        'teamType': team_type,
        'gameMode': 'MONTE'
    }
    result = api_call('POST', '/api/contests', contest_data)
    if 'error' in result or 'id' not in result:
        print(f"❌ Erreur création concours: {result}")
        return False, ["Création concours échouée"]

    contest_id = result['id']
    print(f"✅ Concours créé: {contest_id[:8]}...")

    # 2. Créer les équipes
    for i in range(1, num_teams + 1):
        players = [{'name': f'Joueur{i}{chr(65+j)}', 'order': j+1} for j in range(players_per_team)]
        r = api_call('POST', f'/api/contests/{contest_id}/teams', {'players': players})
        if 'error' in r:
            errors.append(f"Erreur création équipe {i}: {r}")

    # Vérifier les équipes
    contest = api_call('GET', f'/api/contests/{contest_id}')
    teams_count = len(contest.get('teams', []))
    print(f"✅ {teams_count} équipes créées")

    if teams_count != num_teams:
        errors.append(f"Nombre d'équipes incorrect: {teams_count} au lieu de {num_teams}")

    # 3. Générer le tirage
    result = api_call('POST', f'/api/contests/{contest_id}/draw')
    if 'error' in result:
        print(f"❌ Erreur génération tirage: {result}")
        api_call('DELETE', f'/api/contests/{contest_id}')
        return False, [f"Génération tirage échouée: {result}"]

    print(f"✅ Tirage généré")

    # Jouer les matchs et vérifier
    success, play_errors = play_all_matches(contest_id)
    errors.extend(play_errors)

    # Nettoyer
    api_call('DELETE', f'/api/contests/{contest_id}')
    print(f"\n🗑️  Concours supprimé")

    final_success = success and len(errors) == 0
    print_result(final_success, num_teams, errors, "ÉQUIPES")
    return final_success, errors

# =============================================================================
# FONCTIONS COMMUNES
# =============================================================================

def play_all_matches(contest_id):
    """Joue tous les matchs de qualification et de brackets"""
    errors = []

    # Jouer les matchs de qualification
    qual_matches_played = 0
    for iteration in range(50):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0

        for rd in contest.get('qualificationRounds', []):
            for m in rd.get('matches', []):
                if m['status'] != 'FINISHED' and not m.get('isBye'):
                    home = m.get('homeTeam')
                    away = m.get('awayTeam')
                    if home and away:
                        result = api_call('PATCH', f'/api/contests/{contest_id}/qualification-matches/{m["id"]}',
                                         {'winnerTeamId': home['id']})
                        if 'error' not in result:
                            played += 1
                            qual_matches_played += 1

        if played == 0:
            break

    print(f"✅ {qual_matches_played} matchs de qualification joués")

    # Vérifier l'état des qualifications
    contest = api_call('GET', f'/api/contests/{contest_id}')
    for rd in contest.get('qualificationRounds', []):
        unfinished = [m for m in rd.get('matches', []) if m['status'] != 'FINISHED' and not m.get('isBye')]
        if unfinished:
            errors.append(f"Tour {rd['roundNumber']}: {len(unfinished)} matchs non terminés")

    # Jouer les matchs de brackets
    bracket_matches_played = 0
    for iteration in range(30):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0

        for bracket in contest.get('brackets', []):
            for rd in bracket.get('rounds', []):
                for m in rd.get('matches', []):
                    if m.get('isBye') or m['status'] == 'FINISHED':
                        continue

                    home = m.get('homeTeam')
                    away = m.get('awayTeam')

                    if home and away:
                        result = api_call('PATCH', f'/api/contests/{contest_id}/bracket-matches/{m["id"]}',
                                         {'winnerTeamId': home['id']})
                        if 'error' not in result:
                            played += 1
                            bracket_matches_played += 1

        if played == 0:
            break

    print(f"✅ {bracket_matches_played} matchs de brackets joués")

    # Vérifier les résultats finaux
    contest = api_call('GET', f'/api/contests/{contest_id}')
    bracket_a_ok, bracket_b_ok = False, False
    winner_a, winner_b = None, None

    for bracket in contest.get('brackets', []):
        bracket_type = bracket['type']
        finale = None
        for rd in bracket.get('rounds', []):
            if 'Finale' in rd.get('roundName', ''):
                if rd.get('matches'):
                    finale = rd['matches'][0]

        if finale:
            if finale['status'] == 'FINISHED':
                winner = finale.get('winnerTeam', {}).get('teamNumber', '?')
                if bracket_type == 'A':
                    bracket_a_ok, winner_a = True, winner
                else:
                    bracket_b_ok, winner_b = True, winner
            elif finale.get('isBye'):
                home = finale.get('homeTeam')
                if home:
                    winner = f"{home.get('teamNumber', '?')} (auto)"
                else:
                    winner = "(1 seule équipe attendue)"
                if bracket_type == 'A':
                    bracket_a_ok, winner_a = True, winner
                else:
                    bracket_b_ok, winner_b = True, winner
            else:
                home, away = finale.get('homeTeam'), finale.get('awayTeam')
                if not home or not away:
                    errors.append(f"Bracket {bracket_type}: Finale sans équipes")
                else:
                    errors.append(f"Bracket {bracket_type}: Finale non terminée")
        else:
            total = sum(len(rd.get('matches', [])) for rd in bracket.get('rounds', []))
            if total == 0:
                if bracket_type == 'A':
                    bracket_a_ok = True
                else:
                    bracket_b_ok = True
            else:
                errors.append(f"Bracket {bracket_type}: Pas de finale trouvée")

    # Afficher résultats
    print(f"\n{'─'*40}")
    print("RÉSULTATS:")
    if bracket_a_ok:
        print(f"  🏆 Bracket A: Équipe #{winner_a} gagne!" if winner_a else "  ✅ Bracket A: OK")
    else:
        print(f"  ❌ Bracket A: PROBLÈME")

    if bracket_b_ok:
        print(f"  🏆 Bracket B: Équipe #{winner_b} gagne!" if winner_b else "  ✅ Bracket B: OK")
    else:
        print(f"  ❌ Bracket B: PROBLÈME")

    return bracket_a_ok and bracket_b_ok, errors

def print_result(success, count, errors, unit):
    if success:
        print(f"\n{'='*60}")
        print(f"✅ TEST RÉUSSI AVEC {count} {unit}")
        print(f"{'='*60}")
    else:
        print(f"\n{'='*60}")
        print(f"❌ TEST ÉCHOUÉ AVEC {count} {unit}")
        for err in errors:
            print(f"   - {err}")
        print(f"{'='*60}")

def run_tests_melee(team_type, min_players, max_players):
    """Exécute les tests Mélée pour un type d'équipe"""
    type_label = {'TETE_A_TETE': 'Tête-à-tête', 'DOUBLETTE': 'Doublette', 'TRIPLETTE': 'Triplette'}.get(team_type, team_type)
    players_per_team = {'TETE_A_TETE': 1, 'DOUBLETTE': 2, 'TRIPLETTE': 3}.get(team_type, 2)

    print("\n" + "="*60)
    print(f"TESTS MÉLÉE {type_label.upper()} ({min_players} à {max_players} joueurs)")
    print("="*60)

    results = {}
    for num in range(min_players, max_players + 1):
        success, _ = test_melee(num, team_type)
        results[num] = success
        time.sleep(0.2)

    # Résumé
    print(f"\n{'─'*40}")
    print(f"RÉSUMÉ MÉLÉE {type_label.upper()}:")
    passed = sum(1 for v in results.values() if v)
    for num, success in sorted(results.items()):
        status = "✅" if success else "❌"
        print(f"  {status} {num} joueurs → {num // players_per_team} équipes")

    return passed, len(results)

def run_tests_monte(team_type, min_teams, max_teams):
    """Exécute les tests Monté pour un type d'équipe"""
    type_label = {'TETE_A_TETE': 'Tête-à-tête', 'DOUBLETTE': 'Doublette', 'TRIPLETTE': 'Triplette'}.get(team_type, team_type)

    print("\n" + "="*60)
    print(f"TESTS MONTÉ {type_label.upper()} ({min_teams} à {max_teams} équipes)")
    print("="*60)

    results = {}
    for num in range(min_teams, max_teams + 1):
        success, _ = test_monte(num, team_type)
        results[num] = success
        time.sleep(0.2)

    # Résumé
    print(f"\n{'─'*40}")
    print(f"RÉSUMÉ MONTÉ {type_label.upper()}:")
    passed = sum(1 for v in results.values() if v)
    for num, success in sorted(results.items()):
        status = "✅" if success else "❌"
        print(f"  {status} {num} équipes")

    return passed, len(results)

# =============================================================================
# MAIN
# =============================================================================

def main():
    args = sys.argv[1:]

    # Test spécifique
    if len(args) >= 2:
        mode = args[0].lower()
        try:
            num = int(args[1])
            team_type = args[2].upper() if len(args) > 2 else 'DOUBLETTE'

            if mode == 'melee':
                success, _ = test_melee(num, team_type)
            elif mode == 'monte':
                success, _ = test_monte(num, team_type)
            else:
                print(f"Mode inconnu: {mode}")
                sys.exit(1)

            sys.exit(0 if success else 1)
        except ValueError:
            pass

    # Tests par mode
    mode = args[0].lower() if args else 'all'
    all_passed, all_total = 0, 0

    if mode in ('all', 'melee'):
        # Tests Mélée (Doublette et Triplette uniquement, pas Tête-à-tête)
        p, t = run_tests_melee('DOUBLETTE', 6, 22)
        all_passed += p
        all_total += t

        p, t = run_tests_melee('TRIPLETTE', 9, 30)
        all_passed += p
        all_total += t

    if mode in ('all', 'monte'):
        # Tests Monté (tous les types)
        p, t = run_tests_monte('TETE_A_TETE', 3, 15)
        all_passed += p
        all_total += t

        p, t = run_tests_monte('DOUBLETTE', 3, 15)
        all_passed += p
        all_total += t

        p, t = run_tests_monte('TRIPLETTE', 3, 12)
        all_passed += p
        all_total += t

    # Résumé final
    print("\n" + "="*60)
    print("RÉSUMÉ FINAL GLOBAL")
    print("="*60)
    print(f"Total: {all_passed}/{all_total} tests réussis")

    if all_passed == all_total:
        print(f"\n🎉 TOUS LES TESTS PASSENT!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {all_total - all_passed} TESTS ONT ÉCHOUÉ")
        sys.exit(1)

if __name__ == '__main__':
    main()
